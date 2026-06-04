const { generateId, parseProductImages } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const repo = require('../repository/return.repository');
const { ORDER_STATUS, RETURN_STATUS } = require('../../../constants/status');
const { assertReturnTransition } = require('../returnStateMachine');
const logisticsModule = require('../../logistics');
const paymentModule = require('../../payment');

const USER_CANCELABLE_STATUSES = new Set([
  RETURN_STATUS.PENDING,
  RETURN_STATUS.NEED_EVIDENCE,
  RETURN_STATUS.APPROVED,
  RETURN_STATUS.PROCESSING,
  RETURN_STATUS.WAITING_RETURN,
]);

function safeJson(value) {
  return JSON.stringify(value || {});
}

function getLogisticsApi() {
  return /** @type {any} */ (logisticsModule).api || {};
}

function getPaymentApi() {
  return /** @type {any} */ (paymentModule).api || {};
}

async function listReturnTracksQuietly(returnId) {
  const fn = getLogisticsApi().listReturnTracks;
  if (typeof fn !== 'function') return [];
  try {
    return await fn(returnId);
  } catch (err) {
    console.error('[return.service] load return logistics tracks failed:', err?.message || err);
    return [];
  }
}

async function listRefundRecordsQuietly(orderId, returnId) {
  const fn = getPaymentApi().listRefundEventsForReturn;
  if (typeof fn !== 'function') return [];
  try {
    return await fn(orderId, returnId);
  } catch (err) {
    console.error('[return.service] load return refund records failed:', err?.message || err);
    return [];
  }
}

async function refreshReturnShipmentTrackingQuietly(shipment) {
  const fn = getLogisticsApi().refreshReturnShipmentTrackingQuietly;
  if (typeof fn !== 'function') return null;
  try {
    return await fn(shipment);
  } catch (err) {
    console.error('[return.service] refresh return shipment tracking failed:', err?.message || err);
    return null;
  }
}

function uniqueImages(...groups) {
  const out = [];
  for (const group of groups) {
    for (const url of Array.isArray(group) ? group : []) {
      const clean = String(url || '').trim();
      if (clean && !out.includes(clean)) out.push(clean);
    }
  }
  return out.slice(0, 20);
}

function statusEventTitle(status) {
  const titles = {
    [RETURN_STATUS.PENDING]: '售后申请已提交，等待商家审核',
    [RETURN_STATUS.NEED_EVIDENCE]: '商家要求补充凭证',
    [RETURN_STATUS.APPROVED]: '售后申请已通过',
    [RETURN_STATUS.REJECTED]: '售后申请未通过',
    [RETURN_STATUS.PROCESSING]: '商家正在处理售后',
    [RETURN_STATUS.WAITING_RETURN]: '请寄回商品并填写物流',
    [RETURN_STATUS.RETURN_IN_TRANSIT]: '退货物流已提交',
    [RETURN_STATUS.RECEIVED]: '商家已收到退货',
    [RETURN_STATUS.REFUND_PENDING]: '退款等待处理',
    [RETURN_STATUS.REFUNDED]: '退款已处理',
    [RETURN_STATUS.EXCHANGE_SHIPPING]: '换货商品已发出',
    [RETURN_STATUS.COMPLETED]: '售后已完成',
    [RETURN_STATUS.CANCELLED]: '售后申请已取消',
  };
  return titles[status] || '售后进度已更新';
}

async function insertReturnEvent(params) {
  return repo.insertReturnEvent(params);
}

async function insertReturnEventConn(conn, params) {
  return repo.insertReturnEventConn(conn, params);
}

function formatReturnRow(row) {
  if (!row) return row;
  const r = { ...row };
  r.images = parseProductImages(r.images);
  if (r.refund_amount != null) r.refund_amount = parseFloat(r.refund_amount);
  r.item_info = {
    product_name: r.product_name || '',
    product_image: r.product_image || '',
    variant_name: r.variant_name || '',
    sku_code: r.sku_code || '',
    purchased_qty: Number(r.purchased_qty || 0),
    request_qty: Number(r.quantity || 0),
    unit_price: Number(r.unit_price || 0),
  };
  return r;
}

async function getReturnRequests(userId, query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { status } = query;

  const total = await repo.countReturnRequests(userId, status);
  const offset = (page - 1) * pageSize;
  const rows = await repo.selectReturnRequestsPage(userId, status, pageSize, offset);
  const list = rows.map(formatReturnRow);
  return { kind: 'paginate', list, total, page, pageSize };
}

async function getReturnById(userId, returnId) {
  const row = await repo.selectReturnByIdAndUser(returnId, userId);
  if (!row) throw new BusinessError(404, '售后记录不存在');
  const [events, shipments, logisticsTracks, refundRecords] = await Promise.all([
    repo.selectReturnEvents(returnId, userId),
    repo.selectReturnShipments(returnId),
    listReturnTracksQuietly(returnId),
    listRefundRecordsQuietly(row.order_id, returnId),
  ]);
  const data = formatReturnRow(row);
  data.events = events || [];
  data.shipments = shipments || [];
  data.logistics_tracks = logisticsTracks || [];
  data.refund_records = refundRecords || [];
  data.refund_summary = {
    order_payment_status: row.order_payment_status || '',
    order_refund_status: row.order_refund_status || '',
    order_refunded_amount: Number(row.order_refunded_amount || 0),
    refund_amount: Number(row.refund_amount || 0),
  };
  return { data };
}

async function createReturn(userId, body) {
  const {
    order_id, order_item_id, quantity, type, reason, description, images, proof_images, contact_phone,
  } = body;
  if (!order_id || !order_item_id || !reason) throw new BusinessError(400, '请提供订单、商品行和售后原因');
  if (!['refund', 'return_refund', 'exchange', 'repair'].includes(type || 'refund')) {
    throw new BusinessError(400, '不支持的售后类型');
  }

  const order = await repo.selectOrderForReturn(order_id, userId);
  if (!order) throw new BusinessError(404, '订单不存在');
  const orderItem = await repo.selectOrderItemForReturn(order_id, order_item_id);
  if (!orderItem) throw new BusinessError(404, '订单商品行不存在');
  if ((quantity || 1) < 1 || (quantity || 1) > Number(orderItem.qty || 0)) {
    throw new BusinessError(400, '售后数量不能超过购买数量');
  }
  const activeCount = await repo.countActiveReturnRequests(order_id, userId, order_item_id);
  if (activeCount > 0) {
    throw new BusinessError(409, '该订单商品已有未完成售后，请勿重复提交');
  }
  if (![ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED].includes(order.status)) {
    throw new BusinessError(400, '仅已发货或已完成订单可申请售后');
  }

  const id = generateId();
  await repo.insertReturnRequest({
    id,
    userId,
    orderId: order_id,
    orderNo: order.order_no,
    orderItemId: order_item_id || null,
    productId: orderItem?.product_id || null,
    variantId: orderItem?.variant_id || null,
    skuCode: orderItem?.sku_code || '',
    quantity: quantity || 1,
    type: type || 'refund',
    reason,
    description: description || '',
    imagesJson: JSON.stringify(uniqueImages(images, proof_images)),
    status: RETURN_STATUS.PENDING,
    contactPhone: contact_phone || '',
  });
  await repo.insertReturnEvent({
    id: generateId(),
    returnId: id,
    userId,
    actorType: 'user',
    actorId: userId,
    eventType: 'created',
    toStatus: RETURN_STATUS.PENDING,
    title: statusEventTitle(RETURN_STATUS.PENDING),
    note: reason,
    payloadJson: safeJson({ type: type || 'refund', quantity: quantity || 1 }),
  });

  const row = await repo.selectReturnById(id);
  return { data: formatReturnRow(row), message: '售后申请已提交' };
}

async function cancelReturn(userId, returnId, body = {}) {
  const current = await repo.selectReturnByIdAndUser(returnId, userId);
  if (!current) throw new BusinessError(404, '售后记录不存在');
  if (!USER_CANCELABLE_STATUSES.has(current.status)) {
    throw new BusinessError(400, '当前售后状态不能由用户取消，请联系商家处理');
  }
  assertReturnTransition(current.status, RETURN_STATUS.CANCELLED);
  const reason = String(body.reason || '').trim();
  await repo.updateReturnRequestByUser(
    returnId,
    userId,
    ['status = ?', 'admin_remark = COALESCE(admin_remark, ?)'],
    [RETURN_STATUS.CANCELLED, '用户取消售后申请'],
  );
  await repo.insertReturnEvent({
    id: generateId(),
    returnId,
    userId,
    actorType: 'user',
    actorId: userId,
    eventType: 'cancelled',
    fromStatus: current.status,
    toStatus: RETURN_STATUS.CANCELLED,
    title: statusEventTitle(RETURN_STATUS.CANCELLED),
    note: reason || '用户取消售后申请',
  });
  return getReturnById(userId, returnId);
}

async function supplementEvidence(userId, returnId, body = {}) {
  const current = await repo.selectReturnByIdAndUser(returnId, userId);
  if (!current) throw new BusinessError(404, '售后记录不存在');
  if (![RETURN_STATUS.PENDING, RETURN_STATUS.NEED_EVIDENCE].includes(current.status)) {
    throw new BusinessError(400, '当前售后状态不能补充凭证');
  }
  const description = String(body.description || '').trim();
  const nextImages = uniqueImages(parseProductImages(current.images), body.images, body.proof_images);
  if (!description && nextImages.length === parseProductImages(current.images).length) {
    throw new BusinessError(400, '请填写补充说明或上传凭证图片');
  }
  const nextStatus = current.status === RETURN_STATUS.NEED_EVIDENCE ? RETURN_STATUS.PENDING : current.status;
  if (nextStatus !== current.status) assertReturnTransition(current.status, nextStatus);
  const setFragments = ['images = ?'];
  const values = [JSON.stringify(nextImages)];
  if (description) {
    setFragments.push('description = ?');
    values.push([current.description, description].filter(Boolean).join('\n\n'));
  }
  if (nextStatus !== current.status) {
    setFragments.push('status = ?');
    values.push(nextStatus);
  }
  await repo.updateReturnRequestByUser(returnId, userId, setFragments, values);
  await repo.insertReturnEvent({
    id: generateId(),
    returnId,
    userId,
    actorType: 'user',
    actorId: userId,
    eventType: 'evidence_added',
    fromStatus: current.status,
    toStatus: nextStatus,
    title: '用户已补充售后凭证',
    note: description || '已上传凭证图片',
    payloadJson: safeJson({ image_count: nextImages.length }),
  });
  return getReturnById(userId, returnId);
}

async function submitReturnLogistics(userId, returnId, body = {}) {
  const current = await repo.selectReturnByIdAndUser(returnId, userId);
  if (!current) throw new BusinessError(404, '售后记录不存在');
  if (current.status !== RETURN_STATUS.WAITING_RETURN) {
    throw new BusinessError(400, '当前状态还不能填写退货物流');
  }
  const carrier = String(body.carrier || '').trim();
  const trackingNo = String(body.tracking_no || '').trim();
  if (!carrier || !trackingNo) throw new BusinessError(400, '请填写快递公司和物流单号');
  assertReturnTransition(current.status, RETURN_STATUS.RETURN_IN_TRANSIT);
  const shipmentId = generateId();
  await repo.insertReturnShipment({
    id: shipmentId,
    returnId,
    direction: 'buyer_return',
    carrier,
    trackingNo,
    contactPhone: String(body.contact_phone || current.contact_phone || '').trim(),
    note: String(body.note || '').trim(),
    createdByType: 'user',
    createdBy: userId,
  });
  await repo.updateReturnRequestByUser(
    returnId,
    userId,
    ['status = ?'],
    [RETURN_STATUS.RETURN_IN_TRANSIT],
  );
  await repo.insertReturnEvent({
    id: generateId(),
    returnId,
    userId,
    actorType: 'user',
    actorId: userId,
    eventType: 'logistics_submitted',
    fromStatus: current.status,
    toStatus: RETURN_STATUS.RETURN_IN_TRANSIT,
    title: statusEventTitle(RETURN_STATUS.RETURN_IN_TRANSIT),
    note: `${carrier} ${trackingNo}`,
    payloadJson: safeJson({ carrier, tracking_no: trackingNo }),
  });
  await refreshReturnShipmentTrackingQuietly({
    id: shipmentId,
    order_id: current.order_id,
    return_id: returnId,
    direction: 'buyer_return',
    carrier,
    tracking_no: trackingNo,
  });
  return getReturnById(userId, returnId);
}

async function confirmReturnCompleted(userId, returnId) {
  const current = await repo.selectReturnByIdAndUser(returnId, userId);
  if (!current) throw new BusinessError(404, '售后记录不存在');
  if (![RETURN_STATUS.EXCHANGE_SHIPPING, RETURN_STATUS.REFUNDED].includes(current.status)) {
    throw new BusinessError(400, '当前状态不能确认完成');
  }
  assertReturnTransition(current.status, RETURN_STATUS.COMPLETED);
  await repo.updateReturnRequestByUser(returnId, userId, ['status = ?'], [RETURN_STATUS.COMPLETED]);
  await repo.insertReturnEvent({
    id: generateId(),
    returnId,
    userId,
    actorType: 'user',
    actorId: userId,
    eventType: 'completed',
    fromStatus: current.status,
    toStatus: RETURN_STATUS.COMPLETED,
    title: statusEventTitle(RETURN_STATUS.COMPLETED),
    note: '用户确认售后完成',
  });
  return getReturnById(userId, returnId);
}

module.exports = {
  getReturnRequests,
  getReturnById,
  createReturn,
  cancelReturn,
  supplementEvidence,
  submitReturnLogistics,
  confirmReturnCompleted,
  statusEventTitle,
  insertReturnEvent,
  insertReturnEventConn,
};

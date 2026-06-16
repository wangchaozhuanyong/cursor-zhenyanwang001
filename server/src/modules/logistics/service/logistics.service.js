const { NotFoundError, ValidationError } = require('../../../errors');
const { generateId } = require('../../../utils/helpers');
const repo = require('../repository/logistics.repository');
const malaysiaCarrierAdapter = require('../adapters/malaysiaCarrierAdapter');

const STATUS_LABELS = {
  shipped: '已发货',
  tracking_pending: '等待承运商揽收',
  picked_up: '已揽收',
  in_transit: '运输中',
  out_for_delivery: '派送中',
  delivered: '已签收',
  delayed: '物流延误',
  failed_attempt: '派送失败',
  returned: '退回中',
  exception: '物流异常',
  info: '物流更新',
};

const EXCEPTION_LABELS = {
  delayed: '物流延误',
  delivery_failed: '派送失败',
  returned: '包裹退回',
  lost: '疑似丢件',
  damaged: '包裹损坏',
  customs_hold: '清关/海关滞留',
  carrier_exception: '承运商异常',
};

function textIncludes(text, keywords) {
  return keywords.some((keyword) => text.includes(keyword));
}

function normalizeStatusFromText(value) {
  const text = String(value || '').toLowerCase();
  if (!text) return 'info';
  if (textIncludes(text, ['delivered', 'signed', '签收', '已送达'])) return 'delivered';
  if (textIncludes(text, ['out for delivery', '派送', '派件'])) return 'out_for_delivery';
  if (textIncludes(text, ['picked up', 'pickup', 'collected', '揽收'])) return 'picked_up';
  if (textIncludes(text, ['in transit', 'transit', 'departed', 'arrived', '运输', '中转', '到达'])) return 'in_transit';
  if (textIncludes(text, ['delay', 'delayed', '延误', '滞留'])) return 'delayed';
  if (textIncludes(text, ['failed', 'undeliverable', 'attempt', '派送失败', '投递失败'])) return 'failed_attempt';
  if (textIncludes(text, ['return', 'returned', 'rts', '退回', '退件'])) return 'returned';
  if (textIncludes(text, ['exception', 'hold', 'customs', 'damage', 'lost', '异常', '清关', '海关', '损坏', '丢件'])) return 'exception';
  if (textIncludes(text, ['ship', 'manifest', '发货', '已出库'])) return 'shipped';
  return 'info';
}

function resolveExceptionType(status, value) {
  const text = String(value || '').toLowerCase();
  if (status === 'delayed' || textIncludes(text, ['delay', 'delayed', '延误', '滞留'])) return 'delayed';
  if (status === 'failed_attempt' || textIncludes(text, ['failed', 'undeliverable', '派送失败', '投递失败'])) return 'delivery_failed';
  if (status === 'returned' || textIncludes(text, ['return', 'returned', 'rts', '退回', '退件'])) return 'returned';
  if (textIncludes(text, ['lost', 'missing', '丢件', '遗失'])) return 'lost';
  if (textIncludes(text, ['damage', 'damaged', 'broken', '损坏', '破损'])) return 'damaged';
  if (textIncludes(text, ['customs', 'clearance', '海关', '清关'])) return 'customs_hold';
  if (status === 'exception') return 'carrier_exception';
  return '';
}

function resolveSeverity(status, exceptionType) {
  if (['lost', 'damaged', 'returned'].includes(exceptionType)) return 'error';
  if (exceptionType || ['delayed', 'failed_attempt', 'exception'].includes(status)) return 'warning';
  return 'info';
}

function getStatusLabel(status, exceptionType = '') {
  if (exceptionType && EXCEPTION_LABELS[exceptionType]) return EXCEPTION_LABELS[exceptionType];
  return STATUS_LABELS[status] || STATUS_LABELS.info;
}

function normalizeLogisticsTrackEvent(event = {}, fallback = {}) {
  const statusText = [
    event.status,
    event.title,
    event.description,
    event.raw?.status,
    event.raw?.message,
  ].filter(Boolean).join(' ');
  const status = normalizeStatusFromText(statusText || fallback.status || 'info');
  const exceptionType = event.exceptionType || event.exception_type || resolveExceptionType(status, statusText);
  const severity = event.severity || resolveSeverity(status, exceptionType);
  const label = getStatusLabel(status, exceptionType);
  const carrier = event.carrier || fallback.carrier || '';
  return {
    id: event.id || generateId(),
    carrier,
    carrierCode: event.carrierCode || event.carrier_code || fallback.carrierCode || fallback.carrier_code || '',
    trackingNo: event.trackingNo || event.tracking_no || fallback.trackingNo || fallback.tracking_no || '',
    status,
    exceptionType,
    severity,
    title: event.title || label,
    description: event.description || '',
    location: event.location || '',
    eventTime: event.eventTime || event.event_time || new Date(),
    raw: event.raw || event,
  };
}

function normalizeEventTime(value) {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
}

function buildOrderLogisticsSnapshot(order = {}, tracks = []) {
  const sortedTracks = [...tracks].sort((a, b) => (
    normalizeEventTime(b.event_time || b.eventTime) - normalizeEventTime(a.event_time || a.eventTime)
  ));
  const latest = sortedTracks[0] || null;
  const latestStatus = latest?.status || (order.tracking_no ? 'tracking_pending' : '');
  const status = latestStatus || (order.status === 'shipped' ? 'shipped' : '');
  const exceptionType = latest?.exception_type || latest?.exceptionType || resolveExceptionType(status, latest?.description || latest?.title || '');
  const hasException = Boolean(exceptionType);
  return {
    status,
    statusLabel: getStatusLabel(status || 'info', exceptionType),
    exceptionType: exceptionType || '',
    exceptionMessage: hasException
      ? (latest?.description || latest?.title || getStatusLabel(status || 'exception', exceptionType))
      : '',
    hasException,
    latestEventAt: latest?.event_time || latest?.eventTime || order.logistics_latest_event_at || null,
    lastSyncedAt: order.logistics_last_synced_at || null,
  };
}

function formatTrack(row) {
  const exceptionType = row.exception_type || row.exceptionType || '';
  const status = row.status || 'info';
  return {
    id: row.id,
    order_id: row.order_id,
    return_id: row.return_id || null,
    return_shipment_id: row.return_shipment_id || null,
    direction: row.direction || 'order_shipping',
    tracking_no: row.tracking_no,
    carrier: row.carrier,
    carrier_code: row.carrier_code,
    status,
    status_label: getStatusLabel(status, exceptionType),
    exception_type: exceptionType,
    severity: row.severity || resolveSeverity(status, exceptionType),
    title: row.title,
    description: row.description,
    location: row.location,
    event_time: row.event_time,
    source: row.source,
  };
}

function buildProvider(order = {}) {
  if (!order.tracking_no && !order.carrier) return null;
  const carrier = malaysiaCarrierAdapter.resolveCarrier(order.carrier);
  return {
    carrier: carrier.label,
    carrier_code: carrier.code,
    tracking_no: order.tracking_no || '',
    tracking_url: carrier.url || '',
  };
}

async function listTracks(orderId) {
  const rows = await repo.selectTracksByOrderId(orderId);
  return rows.map(formatTrack);
}

async function listReturnTracks(returnId) {
  if (!returnId) return [];
  const rows = await repo.selectTracksByReturnId(returnId);
  return rows.map(formatTrack);
}

async function attachTracking(order) {
  if (!order?.id) return order;
  order.logistics_provider = buildProvider(order);
  try {
    order.logistics_timeline = await listTracks(order.id);
  } catch {
    order.logistics_timeline = [];
  }
  order.tracking_notice = order.tracking_no
    ? 'Tracking info is subject to the carrier website.'
    : '';
  order.logistics_snapshot = buildOrderLogisticsSnapshot(order, order.logistics_timeline || []);
  return order;
}

async function refreshOrderTracking(orderId) {
  const order = await repo.selectOrderForTracking(orderId);
  if (!order) throw new NotFoundError('订单不存在');
  if (!order.tracking_no) {
    throw new ValidationError('缺少物流单号');
  }

  const { carrier, events } = await malaysiaCarrierAdapter.fetchTracking(order);
  const normalizedEvents = events.map((event) => normalizeLogisticsTrackEvent(event, {
    carrier: carrier.label,
    carrierCode: carrier.code,
    trackingNo: order.tracking_no,
  }));
  await repo.replaceAdapterTracks(order.id, order.tracking_no, carrier.code, normalizedEvents);

  const logisticsTimeline = await listTracks(order.id);
  const snapshot = buildOrderLogisticsSnapshot({ ...order, carrier: carrier.label }, logisticsTimeline);
  await repo.updateOrderLogisticsSnapshot(order.id, snapshot);

  return {
    data: {
      logistics_provider: {
        carrier: carrier.label,
        carrier_code: carrier.code,
        tracking_no: order.tracking_no,
        tracking_url: carrier.url || '',
      },
      logistics_timeline: logisticsTimeline,
      logistics_snapshot: snapshot,
      tracking_notice: 'Tracking info is subject to the carrier website.',
    },
    message: normalizedEvents.length ? 'Tracking timeline refreshed' : 'Carrier API not connected',
  };
}

async function refreshOrderTrackingQuietly(orderId) {
  try {
    return await refreshOrderTracking(orderId);
  } catch {
    return null;
  }
}

async function refreshReturnShipmentTracking(shipment) {
  if (!shipment?.order_id || !shipment?.return_id || !shipment?.id) {
    throw new ValidationError('缺少退货物流关联信息');
  }
  if (!shipment.tracking_no) {
    throw new ValidationError('缺少物流单号');
  }

  const { carrier, events } = await malaysiaCarrierAdapter.fetchTracking({
    carrier: shipment.carrier,
    tracking_no: shipment.tracking_no,
  });
  const normalizedEvents = events.map((event) => normalizeLogisticsTrackEvent(event, {
    carrier: carrier.label,
    carrierCode: carrier.code,
    trackingNo: shipment.tracking_no,
  }));
  if (normalizedEvents.length > 0) {
    await repo.replaceAdapterReturnShipmentTracks(shipment, carrier.code, normalizedEvents);
  }

  return {
    data: {
      logistics_provider: {
        carrier: carrier.label,
        carrier_code: carrier.code,
        tracking_no: shipment.tracking_no,
        tracking_url: carrier.url || '',
      },
      logistics_timeline: await listReturnTracks(shipment.return_id),
      tracking_notice: 'Tracking info is subject to the carrier website.',
    },
    message: normalizedEvents.length ? 'Tracking timeline refreshed' : 'Carrier API not connected',
  };
}

async function refreshReturnShipmentTrackingQuietly(shipment) {
  try {
    return await refreshReturnShipmentTracking(shipment);
  } catch {
    return null;
  }
}

async function recordOrderShipment(orderId, payload = {}) {
  const order = await repo.selectOrderForTracking(orderId);
  if (!order) throw new NotFoundError('订单不存在');
  const carrier = malaysiaCarrierAdapter.resolveCarrier(payload.carrier || order.carrier);
  const event = normalizeLogisticsTrackEvent({
    id: payload.id || generateId(),
    carrier: carrier.label,
    carrierCode: carrier.code,
    trackingNo: payload.trackingNo || payload.tracking_no || order.tracking_no || '',
    status: 'shipped',
    title: payload.title || '订单已发货',
    description: payload.description || '平台已提交物流信息，请留意后续承运商轨迹。',
    location: payload.location || '',
    eventTime: payload.eventTime || payload.event_time || new Date(),
    raw: {
      source: 'admin_ship',
      order_no: order.order_no,
      carrier: carrier.label,
    },
  }, {
    carrier: carrier.label,
    carrierCode: carrier.code,
    trackingNo: order.tracking_no || '',
    status: 'shipped',
  });
  await repo.insertManualOrderTrack(order.id, event);
  const logisticsTimeline = await listTracks(order.id);
  const snapshot = buildOrderLogisticsSnapshot({ ...order, carrier: carrier.label }, logisticsTimeline);
  await repo.updateOrderLogisticsSnapshot(order.id, snapshot);
  return {
    data: {
      logistics_provider: buildProvider({ ...order, carrier: carrier.label }),
      logistics_timeline: logisticsTimeline,
      logistics_snapshot: snapshot,
    },
    message: '发货轨迹已记录',
  };
}

async function recordOrderShipmentQuietly(orderId, payload = {}) {
  try {
    return await recordOrderShipment(orderId, payload);
  } catch {
    return null;
  }
}

module.exports = {
  attachTracking,
  listTracks,
  listReturnTracks,
  refreshOrderTracking,
  refreshOrderTrackingQuietly,
  refreshReturnShipmentTracking,
  refreshReturnShipmentTrackingQuietly,
  recordOrderShipment,
  recordOrderShipmentQuietly,
  _internal: {
    normalizeLogisticsTrackEvent,
    buildOrderLogisticsSnapshot,
    getStatusLabel,
  },
};

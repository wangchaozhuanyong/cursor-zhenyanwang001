const { generateId, parseProductImages } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const repo = require('./return.repository');
const { ORDER_STATUS, RETURN_STATUS } = require('../../constants/status');

function formatReturnRow(row) {
  if (!row) return row;
  const r = { ...row };
  r.images = parseProductImages(r.images);
  if (r.refund_amount != null) r.refund_amount = parseFloat(r.refund_amount);
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
  if (!row) throw new BusinessError(404, '退换货记录不存在');
  return { data: formatReturnRow(row) };
}

async function createReturn(userId, body) {
  const { order_id, order_item_id, quantity, type, reason, description, images } = body;
  if (!order_id || !reason) throw new BusinessError(400, '请提供订单ID和退换原因');

  const order = await repo.selectOrderForReturn(order_id, userId);
  if (!order) throw new BusinessError(404, '订单不存在');
  let orderItem = null;
  if (order_item_id) {
    orderItem = await repo.selectOrderItemForReturn(order_id, order_item_id);
    if (!orderItem) throw new BusinessError(404, '订单商品行不存在');
    if ((quantity || 1) > Number(orderItem.qty || 0)) {
      throw new BusinessError(400, '售后数量不能超过购买数量');
    }
  }
  const activeCount = await repo.countActiveReturnRequests(order_id, userId, order_item_id);
  if (activeCount > 0) {
    throw new BusinessError(409, '该订单已有未关闭的退换货申请，请勿重复提交');
  }
  if (![ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED].includes(order.status)) {
    throw new BusinessError(400, '仅已发货或已完成的订单可申请退换货');
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
    imagesJson: JSON.stringify(images || []),
    status: RETURN_STATUS.PENDING,
  });

  const row = await repo.selectReturnById(id);
  return { data: formatReturnRow(row), message: '退换货申请已提交' };
}

module.exports = {
  getReturnRequests,
  getReturnById,
  createReturn,
};

const { NotFoundError, ValidationError } = require('../../errors');
const repo = require('./logistics.repository');
const malaysiaCarrierAdapter = require('./adapters/malaysiaCarrierAdapter');

function formatTrack(row) {
  return {
    id: row.id,
    order_id: row.order_id,
    tracking_no: row.tracking_no,
    carrier: row.carrier,
    carrier_code: row.carrier_code,
    status: row.status,
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

async function attachTracking(order) {
  if (!order?.id) return order;
  order.logistics_provider = buildProvider(order);
  try {
    order.logistics_timeline = await listTracks(order.id);
  } catch {
    order.logistics_timeline = [];
  }
  order.tracking_notice = order.tracking_no
    ? '物流信息以承运商官网为准；当前未接入真实承运商轨迹 API。'
    : '';
  return order;
}

async function refreshOrderTracking(orderId) {
  const order = await repo.selectOrderForTracking(orderId);
  if (!order) throw new NotFoundError('订单不存在');
  if (!order.tracking_no) {
    throw new ValidationError('该订单还没有运单号，无法刷新物流轨迹');
  }

  const { carrier, events } = await malaysiaCarrierAdapter.fetchTracking(order);
  await repo.replaceAdapterTracks(order.id, order.tracking_no, carrier.code, events);

  return {
    data: {
      logistics_provider: {
        carrier: carrier.label,
        carrier_code: carrier.code,
        tracking_no: order.tracking_no,
        tracking_url: carrier.url || '',
      },
      logistics_timeline: await listTracks(order.id),
      tracking_notice: '物流信息以承运商官网为准；当前未接入真实承运商轨迹 API。',
    },
    message: events.length ? '物流轨迹已刷新' : '未接入真实物流 API，请以承运商官网为准',
  };
}

async function refreshOrderTrackingQuietly(orderId) {
  try {
    return await refreshOrderTracking(orderId);
  } catch {
    return null;
  }
}

module.exports = {
  attachTracking,
  listTracks,
  refreshOrderTracking,
  refreshOrderTrackingQuietly,
};

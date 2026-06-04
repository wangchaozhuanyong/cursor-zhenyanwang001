const { NotFoundError, ValidationError } = require('../../../errors');
const repo = require('../repository/logistics.repository');
const malaysiaCarrierAdapter = require('../adapters/malaysiaCarrierAdapter');

function formatTrack(row) {
  return {
    id: row.id,
    order_id: row.order_id,
    return_id: row.return_id || null,
    return_shipment_id: row.return_shipment_id || null,
    direction: row.direction || 'order_shipping',
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
  return order;
}

async function refreshOrderTracking(orderId) {
  const order = await repo.selectOrderForTracking(orderId);
  if (!order) throw new NotFoundError('订单不存在');
  if (!order.tracking_no) {
    throw new ValidationError('缺少物流单号');
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
      tracking_notice: 'Tracking info is subject to the carrier website.',
    },
    message: events.length ? 'Tracking timeline refreshed' : 'Carrier API not connected',
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
  if (events.length > 0) {
    await repo.replaceAdapterReturnShipmentTracks(shipment, carrier.code, events);
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
    message: events.length ? 'Tracking timeline refreshed' : 'Carrier API not connected',
  };
}

async function refreshReturnShipmentTrackingQuietly(shipment) {
  try {
    return await refreshReturnShipmentTracking(shipment);
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
};

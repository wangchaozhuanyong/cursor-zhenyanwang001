const { generateId } = require('../../../utils/helpers');
const { ORDER_STATUS } = require('../../../constants/status');

const CARRIERS = [
  { code: 'jnt_my', names: ['j&t express', 'jnt', 'j&t'], label: 'J&T Express', url: 'https://www.jtexpress.my/track' },
  { code: 'pos_laju', names: ['pos laju', 'poslaju', 'pos malaysia'], label: 'Pos Laju', url: 'https://www.pos.com.my/send/ratecalculator/track' },
  { code: 'ninja_van_my', names: ['ninja van', 'ninjavan'], label: 'Ninja Van', url: 'https://www.ninjavan.co/en-my/tracking' },
  { code: 'dhl_ecommerce_my', names: ['dhl ecommerce', 'dhl e-commerce', 'dhl'], label: 'DHL eCommerce', url: 'https://www.dhl.com/my-en/home/tracking.html' },
  { code: 'gdex', names: ['gd express', 'gdex', 'g dex'], label: 'GD Express', url: 'https://www.gdexpress.com/malaysia/e-tracking' },
  { code: 'citylink_my', names: ['city-link express', 'citylink', 'city link'], label: 'City-Link Express', url: 'https://www.citylinkexpress.com/MY/Tracking.aspx' },
  { code: 'flash_my', names: ['flash express', 'flash'], label: 'Flash Express', url: 'https://www.flashexpress.my/tracking' },
  { code: 'abx_my', names: ['abx', 'abx express'], label: 'ABX Express', url: 'https://www.abxexpress.com.my/track' },
  { code: 'spx_my', names: ['shopee express', 'spx', 'spx express'], label: 'SPX Express', url: 'https://spx.com.my/track' },
];

function addMinutes(date, minutes) {
  return new Date(new Date(date).getTime() + minutes * 60 * 1000);
}

function resolveCarrier(carrier = '') {
  const normalized = String(carrier).trim().toLowerCase();
  const matched = CARRIERS.find((item) => item.names.some((name) => normalized.includes(name)));
  return matched || {
    code: 'other_my',
    label: carrier || 'Malaysia Courier',
    url: '',
  };
}

function buildEvent(order, carrier, status, title, description, location, eventTime) {
  return {
    id: generateId(),
    carrier: carrier.label,
    status,
    title,
    description,
    location,
    eventTime,
    raw: {
      adapter: 'malaysia_fallback',
      carrier_code: carrier.code,
      order_no: order.order_no,
      tracking_no: order.tracking_no || '',
    },
  };
}

async function fetchTracking(order) {
  const carrier = resolveCarrier(order.carrier);
  const createdAt = order.created_at || new Date();
  const events = [
    buildEvent(
      order,
      carrier,
      'order_created',
      '订单已创建',
      '商家已收到订单资料，等待付款与仓库处理。',
      'Malaysia',
      createdAt,
    ),
  ];

  if ([ORDER_STATUS.PAID, ORDER_STATUS.SHIPPED, ORDER_STATUS.COMPLETED].includes(order.status)) {
    events.push(buildEvent(
      order,
      carrier,
      'ready_to_ship',
      '订单已准备出货',
      '仓库正在打包，准备移交马来西亚本地物流。',
      'Warehouse',
      addMinutes(createdAt, 30),
    ));
  }

  if (order.tracking_no) {
    events.push(buildEvent(
      order,
      carrier,
      'picked_up',
      '物流已揽收',
      `${carrier.label} 已收到包裹资料，请使用运单号查询最新承运商状态。`,
      'Selangor Sorting Centre',
      addMinutes(createdAt, 90),
    ));
  }

  if (order.status === ORDER_STATUS.SHIPPED) {
    events.push(buildEvent(
      order,
      carrier,
      'in_transit',
      '运输中',
      '包裹正在马来西亚境内转运，派送前状态会继续更新。',
      'Kuala Lumpur Hub',
      addMinutes(createdAt, 150),
    ));
  }

  if (order.status === ORDER_STATUS.COMPLETED) {
    events.push(buildEvent(
      order,
      carrier,
      'delivered',
      '已签收',
      '买家已确认收货，订单完成。',
      'Delivered',
      new Date(),
    ));
  }

  return {
    carrier,
    events,
  };
}

module.exports = {
  resolveCarrier,
  fetchTracking,
};

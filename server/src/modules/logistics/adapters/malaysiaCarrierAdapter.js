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

function resolveCarrier(carrier = '') {
  const normalized = String(carrier).trim().toLowerCase();
  const matched = CARRIERS.find((item) => item.names.some((name) => normalized.includes(name)));
  return matched || {
    code: 'other_my',
    label: carrier || 'Malaysia Courier',
    url: '',
  };
}

async function fetchTracking(order) {
  return {
    carrier: resolveCarrier(order.carrier),
    events: [],
  };
}

module.exports = {
  resolveCarrier,
  fetchTracking,
};

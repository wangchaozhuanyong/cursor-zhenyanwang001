function cleanId(value) {
  const v = String(value || '').trim();
  return v || '';
}

function allowEnum(value, allowed) {
  const v = String(value || '').trim();
  return allowed.includes(v) ? v : '';
}

function parseReportFilters(query = {}) {
  return {
    category_id: cleanId(query.category_id),
    product_id: cleanId(query.product_id),
    activity_id: cleanId(query.activity_id),
    coupon_id: cleanId(query.coupon_id),
    coupon_campaign_id: cleanId(query.coupon_campaign_id || query.campaign_id),
    order_status: allowEnum(query.order_status, [
      'pending',
      'paid',
      'shipped',
      'completed',
      'cancelled',
      'refunded',
    ]),
    payment_status: allowEnum(query.payment_status, [
      'unpaid',
      'paid',
      'partially_refunded',
      'refunded',
      'pending',
    ]),
    payment_method: allowEnum(query.payment_method, [
      'fpx',
      'card',
      'wallet',
      'cod',
      'wechat',
      'alipay',
      'reward_wallet',
    ]),
    granularity: allowEnum(query.granularity, ['day', 'week', 'month']) || 'day',
  };
}

module.exports = {
  parseReportFilters,
};

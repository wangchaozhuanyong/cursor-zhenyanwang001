/**
 * Telegram 订单通知文案：支付方式、渠道、地址等国家/枚举中文展示
 */

const PAYMENT_METHOD_LABELS = {
  online: '在线支付',
  whatsapp: 'WhatsApp / 客服',
  reward_wallet: '返现钱包',
  mock: '模拟支付（测试）',
  offline: '线下支付',
  manual: '人工确认',
  bank_transfer: '银行转账',
  cash: '现金',
  points_gift: '纯积分兑换',
  points_plus_cash: '积分+现金',
};

const PAYMENT_CHANNEL_LABELS = {
  stripe_checkout: 'Stripe 在线结账',
  stripe: 'Stripe',
  manual_bank: '银行转账 / 线下确认',
  reward_wallet: '返现钱包',
  fpx: 'FPX 网上银行',
  tng_ewallet: "Touch 'n Go 电子钱包",
  grabpay: 'GrabPay',
  boost: 'Boost 钱包',
  malaysia_local: '马来西亚本地支付',
};

const PAYMENT_PROVIDER_LABELS = {
  stripe: 'Stripe 网关',
  manual: '线下人工',
  internal: '内部记账',
  malaysia_local: '马来西亚本地支付',
};

const COUNTRY_LABELS = {
  MY: '马来西亚',
  CN: '中国',
  SG: '新加坡',
};

function labelTelegramPaymentMethod(method, orderType) {
  const m = String(method || '').trim();
  const type = String(orderType || '').trim();
  if (type === 'points_gift' && m === 'points_gift') return '纯积分兑换';
  if (type === 'points_gift' && m === 'points_plus_cash') return '积分+现金';
  if (PAYMENT_METHOD_LABELS[m]) return PAYMENT_METHOD_LABELS[m];
  if (!m) return '未填写';
  return m;
}

function labelTelegramPaymentChannel(channel) {
  const code = String(channel || '').trim();
  if (!code) return '未填写';
  if (PAYMENT_CHANNEL_LABELS[code]) return PAYMENT_CHANNEL_LABELS[code];
  if (PAYMENT_PROVIDER_LABELS[code]) return PAYMENT_PROVIDER_LABELS[code];
  return code;
}

function formatTelegramShippingAddress(raw) {
  const text = String(raw || '').trim();
  if (!text) return '未填写';

  const parts = text.split(',').map((part) => part.trim()).filter(Boolean);
  if (parts.length >= 2) {
    const last = parts[parts.length - 1].toUpperCase();
    if (COUNTRY_LABELS[last]) {
      parts[parts.length - 1] = COUNTRY_LABELS[last];
      return parts.join('，');
    }
  }

  return text
    .replace(/,\s*MY\s*$/i, '，马来西亚')
    .replace(/,/g, '，');
}

module.exports = {
  labelTelegramPaymentMethod,
  labelTelegramPaymentChannel,
  formatTelegramShippingAddress,
  PAYMENT_METHOD_LABELS,
  PAYMENT_CHANNEL_LABELS,
};

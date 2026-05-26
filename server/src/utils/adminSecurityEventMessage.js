/** 安全审计 / 事件中心：将 method + path 转为可读中文（与前端 auditLogI18n 对齐） */

const HTTP_METHOD_ZH = {
  GET: '查询',
  POST: '提交',
  PUT: '更新',
  PATCH: '部分更新',
  DELETE: '删除',
};

const PAYMENT_CHANNEL_ID_ZH = {
  ch_manual_bank: '手动银行转账',
  ch_stripe_checkout: 'Stripe 在线支付',
  ch_reward_wallet: '返现余额支付',
};

const TOKEN_ZH = {
  settings: '设置',
  assets: '资源',
  security: '安全',
  channels: '渠道',
  rbac: '权限',
  'admin-users': '管理员账号',
  admin_users: '管理员账号',
  payments: '支付',
  reset: '重置',
  password: '密码',
  required: '要求',
  mfa: '多因素验证',
};

const PATH_RULES = [
  { pattern: /^\/payments\/channels\/([^/]+)$/, label: (m) => `支付渠道「${zhPaymentChannelId(m[1])}」` },
  { pattern: /^\/settings\/assets\/faviconUrl\/?$/, label: '网站图标' },
  { pattern: /^\/settings\/assets\/logoUrl\/?$/, label: '站点 Logo 图片' },
  { pattern: /^\/settings\/?$/, label: '站点设置' },
  {
    pattern: /^\/rbac\/admin-users\/([^/]+)\/security\/mfa-required\/?$/,
    label: (m) => `管理员账号 ${shortId(m[1])} · 多因素验证`,
  },
  {
    pattern: /^\/rbac\/admin-users\/([^/]+)\/reset-password\/?$/,
    label: (m) => `管理员账号 ${shortId(m[1])} · 登录密码`,
  },
  { pattern: /^\/rbac\//, label: '权限配置' },
  { pattern: /^\/payments\//, label: '支付配置' },
  { pattern: /^\/settings/, label: '站点设置' },
];

function shortId(id) {
  const s = String(id || '').trim();
  if (s.length <= 12) return s;
  return `…${s.slice(-8)}`;
}

function zhPaymentChannelId(id) {
  const key = String(id || '').trim();
  if (PAYMENT_CHANNEL_ID_ZH[key]) return PAYMENT_CHANNEL_ID_ZH[key];
  if (key.startsWith('ch_')) return key.slice(3).replace(/_/g, ' ');
  return key;
}

function zhAdminApiPath(path) {
  const route = String(path || '').split('?')[0].trim();
  for (const rule of PATH_RULES) {
    const match = route.match(rule.pattern);
    if (match) {
      return typeof rule.label === 'function' ? rule.label(match) : rule.label;
    }
  }
  const segments = route.replace(/^\//, '').split('/').filter(Boolean);
  if (!segments.length) return '管理端接口';
  return segments
    .map((seg) => {
      if (/^[0-9a-f-]{36}$/i.test(seg)) return shortId(seg);
      if (PAYMENT_CHANNEL_ID_ZH[seg]) return PAYMENT_CHANNEL_ID_ZH[seg];
      return TOKEN_ZH[seg.replace(/-/g, '_')] || TOKEN_ZH[seg] || seg;
    })
    .join(' / ');
}

function formatAdminSecurityEventMessage(method, path, suffix = '已执行') {
  const methodZh = HTTP_METHOD_ZH[String(method || '').toUpperCase()] || method;
  const pathZh = zhAdminApiPath(path);
  return `${methodZh}${pathZh}（${suffix}）`;
}

module.exports = {
  formatAdminSecurityEventMessage,
  zhAdminApiPath,
};

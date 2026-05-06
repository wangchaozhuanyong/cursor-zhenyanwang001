const db = require('../../config/db');

const SETTING_KEY = 'notificationTriggerRules';

const DEFAULT_NOTIFICATION_TRIGGERS = [
  { key: 'order_status_paid', label: '管理员确认付款', description: '订单状态被管理员改为已付款时通知用户', enabled: true },
  { key: 'order_status_shipped', label: '管理员改为已发货', description: '订单状态被管理员改为已发货时通知用户', enabled: true },
  { key: 'order_status_completed', label: '管理员改为已完成', description: '订单状态被管理员改为已完成时通知用户', enabled: true },
  { key: 'order_status_cancelled', label: '管理员取消订单', description: '订单状态被管理员改为已取消时通知用户', enabled: true },
  { key: 'order_status_refunding', label: '订单进入退款中', description: '订单状态被管理员改为退款处理中时通知用户', enabled: true },
  { key: 'order_status_refunded', label: '订单退款完成', description: '订单状态被管理员改为已退款时通知用户', enabled: true },
  { key: 'order_ship', label: '填写物流发货', description: '管理员在订单发货表单提交物流信息后通知用户', enabled: true },
  { key: 'stripe_payment_success', label: 'Stripe 支付成功', description: 'Stripe 回调确认支付成功后通知用户', enabled: true },
  { key: 'return_approved', label: '售后退款批准', description: '售后单被批准并生成退款结果时通知用户', enabled: true },
];

function normalizeRules(raw) {
  let saved = {};
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
    } catch { /* use defaults */ }
  }

  return DEFAULT_NOTIFICATION_TRIGGERS.map((rule) => ({
    ...rule,
    enabled: saved[rule.key] === undefined ? rule.enabled : saved[rule.key] === true,
  }));
}

async function getNotificationTriggerSettings() {
  const [[row]] = await db.query('SELECT setting_value FROM site_settings WHERE setting_key = ?', [SETTING_KEY]);
  return normalizeRules(row?.setting_value || '');
}

async function updateNotificationTriggerSettings(rules) {
  const allowed = new Set(DEFAULT_NOTIFICATION_TRIGGERS.map((r) => r.key));
  const next = {};
  for (const item of Array.isArray(rules) ? rules : []) {
    if (item && allowed.has(item.key)) {
      next[item.key] = item.enabled === true;
    }
  }
  await db.query(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
    [SETTING_KEY, JSON.stringify(next), JSON.stringify(next)],
  );
  return getNotificationTriggerSettings();
}

async function isNotificationTriggerEnabled(key) {
  const rules = await getNotificationTriggerSettings();
  const hit = rules.find((r) => r.key === key);
  return hit ? hit.enabled === true : true;
}

module.exports = {
  DEFAULT_NOTIFICATION_TRIGGERS,
  getNotificationTriggerSettings,
  updateNotificationTriggerSettings,
  isNotificationTriggerEnabled,
};

const repo = require('./notificationTriggerSettings.repository');

/** 各自动通知的默认标题/正文模板；留空未配置时使用此处。占位符用 {order_no} 形式 */
const TRIGGER_DEFAULT_COPY = {
  order_status_paid: {
    title: '订单{order_no}',
    content: '您的订单已确认付款',
  },
  order_status_shipped: {
    title: '订单{order_no}',
    content: '您的订单已发货，请注意查收',
  },
  order_status_completed: {
    title: '订单{order_no}',
    content: '订单已完成，感谢您的购买',
  },
  order_status_cancelled: {
    title: '订单{order_no}',
    content: '您的订单已取消',
  },
  order_status_refunding: {
    title: '订单{order_no}',
    content: '您的退款申请正在处理中',
  },
  order_status_refunded: {
    title: '订单{order_no}',
    content: '退款已到账',
  },
  order_ship: {
    title: '订单已发货',
    content: '您的订单 {order_no} 已发货，物流：{carrier} {tracking_no}',
  },
  stripe_payment_success: {
    title: '支付成功',
    content: '订单 {order_no} 已通过 Stripe 支付成功',
  },
  manual_order_mark_paid: {
    title: '订单已确认支付',
    content: '订单 {order_no} 已标记为已支付，请留意发货进度',
  },
  return_approved: {
    title: '退款已批准',
    content: '您的订单 {order_no} 退款已批准，退款金额 RM {refund_amount}',
  },
};

const PLACEHOLDERS_BY_KEY = {
  order_status_paid: ['order_no'],
  order_status_shipped: ['order_no'],
  order_status_completed: ['order_no'],
  order_status_cancelled: ['order_no'],
  order_status_refunding: ['order_no'],
  order_status_refunded: ['order_no'],
  order_ship: ['order_no', 'carrier', 'tracking_no'],
  stripe_payment_success: ['order_no'],
  manual_order_mark_paid: ['order_no'],
  return_approved: ['order_no', 'refund_amount'],
};

const DEFAULT_NOTIFICATION_TRIGGERS = [
  { key: 'order_status_paid', label: '管理员确认付款', description: '订单状态被管理员改为已付款时通知用户', enabled: true },
  { key: 'order_status_shipped', label: '管理员改为已发货', description: '订单状态被管理员改为已发货时通知用户', enabled: true },
  { key: 'order_status_completed', label: '管理员改为已完成', description: '订单状态被管理员改为已完成时通知用户', enabled: true },
  { key: 'order_status_cancelled', label: '管理员取消订单', description: '订单状态被管理员改为已取消时通知用户', enabled: true },
  { key: 'order_status_refunding', label: '订单进入退款中', description: '订单状态被管理员改为退款处理中时通知用户', enabled: true },
  { key: 'order_status_refunded', label: '订单退款完成', description: '订单状态被管理员改为已退款时通知用户', enabled: true },
  { key: 'order_ship', label: '填写物流发货', description: '管理员在订单发货表单提交物流信息后通知用户', enabled: true },
  { key: 'stripe_payment_success', label: 'Stripe 支付成功', description: 'Stripe 回调确认支付成功后通知用户', enabled: true },
  { key: 'manual_order_mark_paid', label: '管理员补记已支付', description: '管理员在后台将订单补记为已支付时通知用户', enabled: true },
  { key: 'return_approved', label: '售后退款批准', description: '售后单被批准并生成退款结果时通知用户', enabled: true },
];

function applyTemplate(str, vars) {
  if (str == null || str === '') return '';
  let out = String(str);
  const map = vars && typeof vars === 'object' ? vars : {};
  for (const [k, v] of Object.entries(map)) {
    const rep = v != null && v !== '' ? String(v) : '';
    out = out.split(`{${k}}`).join(rep);
  }
  return out;
}

function parseStoredMap(raw) {
  let saved = {};
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) saved = parsed;
    } catch { /* use defaults */ }
  }
  return saved;
}

function parseStoredEntry(key, stored, ruleDefault) {
  const defs = TRIGGER_DEFAULT_COPY[key];
  if (!defs) return null;

  let enabled = ruleDefault.enabled;
  let customTitle = '';
  let customContent = '';

  if (stored === undefined) {
    enabled = ruleDefault.enabled;
  } else if (stored === true) {
    enabled = true;
  } else if (stored === false) {
    enabled = false;
  } else if (stored && typeof stored === 'object') {
    enabled = stored.enabled !== false;
    if (typeof stored.title === 'string') customTitle = stored.title;
    if (typeof stored.content === 'string') customContent = stored.content;
  }

  return {
    key,
    label: ruleDefault.label,
    description: ruleDefault.description,
    enabled,
    title: customTitle,
    content: customContent,
    default_title: defs.title,
    default_content: defs.content,
    placeholders: PLACEHOLDERS_BY_KEY[key] || [],
  };
}

function normalizeRules(raw) {
  const saved = parseStoredMap(raw);
  return DEFAULT_NOTIFICATION_TRIGGERS.map((rule) => parseStoredEntry(rule.key, saved[rule.key], rule)).filter(Boolean);
}

async function getNotificationTriggerSettings() {
  const raw = await repo.selectTriggerRulesRaw();
  return normalizeRules(raw);
}

/**
 * @param {Array<{ key: string, enabled?: boolean, title?: string, content?: string }>} rules
 */
async function updateNotificationTriggerSettings(rules) {
  const allowed = new Set(DEFAULT_NOTIFICATION_TRIGGERS.map((r) => r.key));
  const rawPrev = await repo.selectTriggerRulesRaw();
  const next = parseStoredMap(rawPrev);

  for (const item of Array.isArray(rules) ? rules : []) {
    if (!item || !allowed.has(item.key)) continue;
    const enabled = item.enabled === true;
    const title = typeof item.title === 'string' ? item.title.trim() : '';
    const content = typeof item.content === 'string' ? item.content.trim() : '';

    if (!enabled && !title && !content) {
      next[item.key] = false;
    } else if (enabled && !title && !content) {
      next[item.key] = true;
    } else {
      const entry = { enabled };
      if (title) entry.title = title;
      if (content) entry.content = content;
      next[item.key] = entry;
    }
  }
  await repo.upsertTriggerRulesRaw(JSON.stringify(next));
  return getNotificationTriggerSettings();
}

async function isNotificationTriggerEnabled(key) {
  const rules = await getNotificationTriggerSettings();
  const hit = rules.find((r) => r.key === key);
  return hit ? hit.enabled === true : true;
}

/**
 * 按后台配置解析最终标题与正文；未开启或未知 key 时返回 null
 * @param {string} key
 * @param {Record<string, string | number>} vars
 */
async function getResolvedTriggerCopy(key, vars) {
  const defs = TRIGGER_DEFAULT_COPY[key];
  if (!defs) return null;
  const rules = await getNotificationTriggerSettings();
  const rule = rules.find((r) => r.key === key);
  if (!rule || !rule.enabled) return null;
  const titleTpl = (rule.title && String(rule.title).trim()) ? rule.title : defs.title;
  const contentTpl = (rule.content && String(rule.content).trim()) ? rule.content : defs.content;
  return {
    title: applyTemplate(titleTpl, vars),
    content: applyTemplate(contentTpl, vars),
  };
}

module.exports = {
  DEFAULT_NOTIFICATION_TRIGGERS,
  getNotificationTriggerSettings,
  updateNotificationTriggerSettings,
  isNotificationTriggerEnabled,
  getResolvedTriggerCopy,
};

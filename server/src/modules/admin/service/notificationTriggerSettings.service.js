const repo = require('../repository/notificationTriggerSettings.repository');
const { BusinessError } = require('../../../errors/BusinessError');

/** Default title/content templates used when trigger copy is not configured. */
const TRIGGER_DEFAULT_COPY = {
  order_status_paid: {
    title: '订单 {order_no} 已支付',
    content: '您的订单已支付成功，我们会尽快为您安排处理。',
  },
  order_status_shipped: {
    title: '订单 {order_no} 已发货',
    content: '您的订单已发货，请留意物流动态。',
  },
  order_status_completed: {
    title: '订单 {order_no} 已完成',
    content: '您的订单已完成，感谢您的购买。',
  },
  order_status_cancelled: {
    title: '订单 {order_no} 已取消',
    content: '您的订单已取消，如有疑问请联系客服。',
  },
  order_status_refunding: {
    title: '订单 {order_no} 退款处理中',
    content: '您的退款申请正在处理中，请耐心等待。',
  },
  order_status_refunded: {
    title: '订单 {order_no} 已退款',
    content: '您的退款已处理完成，请留意账户变动。',
  },
  order_ship: {
    title: '订单已发货',
    content: '订单 {order_no} 已发货。承运商：{carrier}，物流单号：{tracking_no}。',
  },
  stripe_payment_success: {
    title: '支付成功',
    content: '订单 {order_no} 已通过 Stripe 支付成功。',
  },
  manual_order_mark_paid: {
    title: '订单已确认收款',
    content: '订单 {order_no} 已被管理员标记为已支付，请留意后续发货进度。',
  },
  return_approved: {
    title: '售后申请已通过',
    content: '订单 {order_no} 的退款申请已通过，退款金额：RM {refund_amount}。',
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

const LEGACY_ENGLISH_COPY = {
  order_ship: {
    title: ['Order shipped'],
    content: [
      'Order #{order_no} has shipped. Carrier: {carrier}, Tracking: {tracking_no}.',
      'Order #{order_no} has shipped. Carrier: {carrier}. Tracking: {tracking_no}.',
      'Order {order_no} has shipped. Carrier: {carrier}, Tracking: {tracking_no}.',
      'Order {order_no} has shipped. Carrier: {carrier}. Tracking: {tracking_no}.',
    ],
  },
};

function isLegacyEnglishCopy(key, kind, value) {
  if (!value) return false;
  const cfg = LEGACY_ENGLISH_COPY[key];
  if (!cfg) return false;
  const pool = kind === 'title' ? cfg.title : cfg.content;
  if (!Array.isArray(pool) || pool.length === 0) return false;
  const normalized = String(value).trim().toLowerCase();
  return pool.some((item) => String(item).trim().toLowerCase() === normalized);
}

const DEFAULT_NOTIFICATION_TRIGGERS = [
  { key: 'order_status_paid', label: '订单已支付', description: '订单被标记为已支付时通知用户。', enabled: true },
  { key: 'order_status_shipped', label: '订单已发货', description: '订单状态变为已发货时通知用户。', enabled: true },
  { key: 'order_status_completed', label: '订单已完成', description: '订单状态变为已完成时通知用户。', enabled: true },
  { key: 'order_status_cancelled', label: '订单已取消', description: '订单状态变为已取消时通知用户。', enabled: true },
  { key: 'order_status_refunding', label: '退款处理中', description: '订单进入退款处理流程时通知用户。', enabled: true },
  { key: 'order_status_refunded', label: '订单已退款', description: '订单退款完成时通知用户。', enabled: true },
  { key: 'order_ship', label: '物流信息已提交', description: '管理员提交物流信息后通知用户。', enabled: true },
  { key: 'stripe_payment_success', label: 'Stripe 支付成功', description: 'Stripe 支付回调成功后通知用户。', enabled: true },
  { key: 'manual_order_mark_paid', label: '手动确认收款', description: '管理员手动将订单标记为已支付时通知用户。', enabled: true },
  { key: 'return_approved', label: '售后申请通过', description: '退货/退款申请审核通过时通知用户。', enabled: true },
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

  if (isLegacyEnglishCopy(key, 'title', customTitle)) customTitle = '';
  if (isLegacyEnglishCopy(key, 'content', customContent)) customContent = '';

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
    const allowedPlaceholders = new Set(PLACEHOLDERS_BY_KEY[item.key] || []);
    const bad = [];
    for (const src of [title, content]) {
      for (const m of src.matchAll(/\{([a-zA-Z0-9_]+)\}/g)) {
        const token = m[1];
        if (!allowedPlaceholders.has(token)) bad.push(token);
      }
    }
    if (bad.length) {
      throw new BusinessError(400, `瑙勫垯 ${item.key} 瀛樺湪鏈煡鍗犱綅绗? ${[...new Set(bad)].join(', ')}`);
    }

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
 * 鎸夊悗鍙伴厤缃В鏋愭渶缁堟爣棰樹笌姝ｆ枃锛涙湭寮€鍚垨鏈煡 key 鏃惰繑鍥?null
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








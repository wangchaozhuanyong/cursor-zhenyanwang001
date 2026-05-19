const repo = require('../repository/notificationTriggerSettings.repository');
const { BusinessError } = require('../../../errors/BusinessError');

/** Default title/content templates used when trigger copy is not configured. */
const TRIGGER_DEFAULT_COPY = {
  order_status_paid: {
    title: 'Order {order_no}',
    content: 'Your order has been paid.',
  },
  order_status_shipped: {
    title: 'Order {order_no}',
    content: 'Your order has been shipped.',
  },
  order_status_completed: {
    title: 'Order {order_no}',
    content: 'Your order is completed. Thanks for your purchase.',
  },
  order_status_cancelled: {
    title: 'Order {order_no}',
    content: 'Your order has been cancelled.',
  },
  order_status_refunding: {
    title: 'Order {order_no}',
    content: 'Your refund request is being processed.',
  },
  order_status_refunded: {
    title: 'Order {order_no}',
    content: 'Your refund has been completed.',
  },
  order_ship: {
    title: 'Order shipped',
    content: 'Order {order_no} has shipped. Carrier: {carrier}, Tracking: {tracking_no}.',
  },
  stripe_payment_success: {
    title: 'Payment successful',
    content: 'Order {order_no} was paid successfully via Stripe.',
  },
  manual_order_mark_paid: {
    title: 'Order marked paid',
    content: 'Order {order_no} is marked as paid. Please follow shipment progress.',
  },
  return_approved: {
    title: 'Refund approved',
    content: 'Refund for order {order_no} is approved. Amount: RM {refund_amount}.',
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
  { key: 'order_status_paid', label: 'Order paid', description: 'Notify user when order is marked as paid.', enabled: true },
  { key: 'order_status_shipped', label: 'Order shipped', description: 'Notify user when order status becomes shipped.', enabled: true },
  { key: 'order_status_completed', label: 'Order completed', description: 'Notify user when order status becomes completed.', enabled: true },
  { key: 'order_status_cancelled', label: 'Order cancelled', description: 'Notify user when order status becomes cancelled.', enabled: true },
  { key: 'order_status_refunding', label: 'Order refunding', description: 'Notify user when order enters refund processing.', enabled: true },
  { key: 'order_status_refunded', label: 'Order refunded', description: 'Notify user when order refund is completed.', enabled: true },
  { key: 'order_ship', label: 'Shipping submitted', description: 'Notify user when shipping info is submitted.', enabled: true },
  { key: 'stripe_payment_success', label: 'Stripe payment success', description: 'Notify user when Stripe payment callback succeeds.', enabled: true },
  { key: 'manual_order_mark_paid', label: 'Manual paid mark', description: 'Notify user when admin manually marks order as paid.', enabled: true },
  { key: 'return_approved', label: 'Refund approved', description: 'Notify user when return/refund is approved.', enabled: true },
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








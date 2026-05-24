const SETTING_KEY = 'telegram_notify_config';

/** 保存时前端传此值表示不修改已有 Bot Token */
const BOT_TOKEN_UNCHANGED = '__KEEP__';

const DEFAULT_TELEGRAM_NOTIFY_CONFIG = Object.freeze({
  /** @deprecated 请使用 orderNotifyEnabled；保存时仍会写入以兼容旧数据 */
  enabled: false,
  orderNotifyEnabled: false,
  eventNotifyEnabled: false,
  /** 开启事件通知时，P0/P1 新事件是否即时推送 */
  eventNotifyImmediate: true,
  botToken: '',
  adminChatId: '',
  parseMode: 'HTML',
  includeOrderItems: true,
  maxMessageLength: 3900,
  adminFrontendUrl: '',
});

function parseBoolFlag(value, fallback = false) {
  if (value === true || value === 'true' || value === 1 || value === '1') return true;
  if (value === false || value === 'false' || value === 0 || value === '0') return false;
  return fallback;
}

const PARSE_MODES = new Set(['HTML', 'Markdown', 'MarkdownV2']);

/**
 * @typedef {object} TelegramNotifyConfigInput
 * @property {boolean|string|number=} enabled
 * @property {string=} botToken
 * @property {string=} adminChatId
 * @property {string=} parseMode
 * @property {boolean|string=} includeOrderItems
 * @property {number|string=} maxMessageLength
 * @property {string=} adminFrontendUrl
 * @property {string=} configSource
 */

function readEnvTelegramConfig() {
  const orderOn = String(process.env.TELEGRAM_ENABLED || '').toLowerCase() === 'true';
  const eventOn = String(process.env.TELEGRAM_EVENT_NOTIFY_ENABLED || '').toLowerCase() === 'true';
  return {
    enabled: orderOn,
    orderNotifyEnabled: orderOn,
    eventNotifyEnabled: eventOn,
    eventNotifyImmediate: String(process.env.TELEGRAM_EVENT_NOTIFY_IMMEDIATE || 'true').toLowerCase() !== 'false',
    botToken: String(process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    adminChatId: String(process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim(),
    parseMode: String(process.env.TELEGRAM_PARSE_MODE || 'HTML').trim() || 'HTML',
    includeOrderItems: String(process.env.TELEGRAM_INCLUDE_ORDER_ITEMS || 'true').toLowerCase() !== 'false',
    maxMessageLength: Number(process.env.TELEGRAM_MAX_MESSAGE_LENGTH || 3900) || 3900,
    adminFrontendUrl: resolveAdminFrontendBaseUrl(),
  };
}

/**
 * 管理后台对外访问根地址（不含路径）。
 * 优先：显式配置 → ADMIN_PUBLIC_URL → ADMIN_FRONTEND_URL → PUBLIC_APP_URL
 * 若误将主站域名写入 Telegram 设置而控制台在独立子域，则自动改用 ADMIN_PUBLIC_URL。
 */
function resolveAdminFrontendBaseUrl(override = '') {
  const custom = String(override || '').trim().replace(/\/+$/, '');
  const adminPublic = String(process.env.ADMIN_PUBLIC_URL || '').trim().replace(/\/+$/, '');
  const adminFrontend = String(process.env.ADMIN_FRONTEND_URL || '').trim().replace(/\/+$/, '');
  const publicApp = String(process.env.PUBLIC_APP_URL || '').trim().replace(/\/+$/, '');

  if (custom) {
    if (adminPublic && publicApp && custom === publicApp && adminPublic !== publicApp) {
      return adminPublic;
    }
    return custom;
  }
  return adminPublic || adminFrontend || publicApp;
}

/** @param {string} orderId @param {string} [orderNo] */
function buildAdminOrderUrlPath(orderId, orderNo) {
  const id = String(orderId || '').trim();
  if (id) {
    return `/admin/orders/${encodeURIComponent(id)}`;
  }
  const keyword = String(orderNo || orderId || '').trim().replace(/^#+/, '');
  return `/admin/orders?keyword=${encodeURIComponent(keyword)}`;
}

function buildAdminOrderUrl(overrideBase, orderId, orderNo) {
  const base = resolveAdminFrontendBaseUrl(overrideBase);
  const path = buildAdminOrderUrlPath(orderId, orderNo);
  return base ? `${base}${path}` : path;
}

function parseStoredConfig(raw) {
  if (!raw) return null;
  /** @type {unknown} */
  let parsed = raw;
  if (typeof raw === 'string' && raw.trim()) {
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  return parsed;
}

/**
 * @param {TelegramNotifyConfigInput} [input]
 */
function normalizeTelegramNotifyConfig(input = {}, options = {}) {
  const source = /** @type {TelegramNotifyConfigInput} */ (input && typeof input === 'object' ? input : {});
  const parseModeRaw = String(source.parseMode || DEFAULT_TELEGRAM_NOTIFY_CONFIG.parseMode).trim();
  const parseMode = PARSE_MODES.has(parseModeRaw) ? parseModeRaw : 'HTML';
  const maxLen = Number(source.maxMessageLength);
  const legacyEnabled = source.enabled !== undefined
    ? parseBoolFlag(source.enabled, false)
    : undefined;
  const orderNotifyEnabled = source.orderNotifyEnabled !== undefined
    ? parseBoolFlag(source.orderNotifyEnabled, false)
    : (legacyEnabled !== undefined ? legacyEnabled : false);
  const eventNotifyEnabled = parseBoolFlag(source.eventNotifyEnabled, false);
  const eventNotifyImmediate = source.eventNotifyImmediate !== undefined
    ? parseBoolFlag(source.eventNotifyImmediate, true)
    : true;
  return {
    enabled: orderNotifyEnabled,
    orderNotifyEnabled,
    eventNotifyEnabled,
    eventNotifyImmediate,
    botToken: String(source.botToken || '').trim(),
    adminChatId: String(source.adminChatId || '').trim(),
    parseMode,
    includeOrderItems: source.includeOrderItems !== false && source.includeOrderItems !== 'false',
    maxMessageLength: Number.isFinite(maxLen)
      ? Math.min(4096, Math.max(500, Math.round(maxLen)))
      : DEFAULT_TELEGRAM_NOTIFY_CONFIG.maxMessageLength,
    adminFrontendUrl: String(source.adminFrontendUrl || '').trim().replace(/\/$/, ''),
  };
}

/** 数据库配置优先；未填写的敏感项回退到环境变量 */
function mergeTelegramNotifyConfig(envConfig, storedConfig) {
  const env = normalizeTelegramNotifyConfig(envConfig || readEnvTelegramConfig());
  const stored = storedConfig ? normalizeTelegramNotifyConfig(storedConfig) : null;
  if (!stored) return { ...env, configSource: 'env' };
  return {
    enabled: stored.orderNotifyEnabled,
    orderNotifyEnabled: stored.orderNotifyEnabled,
    eventNotifyEnabled: stored.eventNotifyEnabled,
    eventNotifyImmediate: stored.eventNotifyImmediate,
    botToken: stored.botToken || env.botToken,
    adminChatId: stored.adminChatId || env.adminChatId,
    parseMode: stored.parseMode || env.parseMode,
    includeOrderItems: stored.includeOrderItems,
    maxMessageLength: stored.maxMessageLength,
    adminFrontendUrl: resolveAdminFrontendBaseUrl(stored.adminFrontendUrl || env.adminFrontendUrl),
    configSource: 'database',
  };
}

function maskBotToken(token) {
  const t = String(token || '').trim();
  if (!t) return '';
  if (t.length <= 8) return '****';
  return `${t.slice(0, 4)}…${t.slice(-4)}`;
}

/**
 * @param {TelegramNotifyConfigInput} config
 */
function toAdminSettingsView(config) {
  const normalized = normalizeTelegramNotifyConfig(config);
  return {
    enabled: normalized.orderNotifyEnabled,
    orderNotifyEnabled: normalized.orderNotifyEnabled,
    eventNotifyEnabled: normalized.eventNotifyEnabled,
    eventNotifyImmediate: normalized.eventNotifyImmediate,
    botToken: '',
    botTokenMasked: maskBotToken(normalized.botToken),
    botTokenConfigured: !!normalized.botToken,
    adminChatId: normalized.adminChatId,
    parseMode: normalized.parseMode,
    includeOrderItems: normalized.includeOrderItems,
    maxMessageLength: normalized.maxMessageLength,
    adminFrontendUrl: normalized.adminFrontendUrl,
    configSource: config.configSource === 'env' ? 'env' : 'database',
  };
}

function resolveBotTokenOnSave(incomingToken, existingToken) {
  const raw = String(incomingToken ?? '').trim();
  if (!raw || raw === BOT_TOKEN_UNCHANGED) return String(existingToken || '').trim();
  return raw;
}

module.exports = {
  SETTING_KEY,
  BOT_TOKEN_UNCHANGED,
  DEFAULT_TELEGRAM_NOTIFY_CONFIG,
  PARSE_MODES,
  parseBoolFlag,
  readEnvTelegramConfig,
  parseStoredConfig,
  normalizeTelegramNotifyConfig,
  mergeTelegramNotifyConfig,
  maskBotToken,
  toAdminSettingsView,
  resolveBotTokenOnSave,
  resolveAdminFrontendBaseUrl,
  buildAdminOrderUrlPath,
  buildAdminOrderUrl,
};

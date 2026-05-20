const SETTING_KEY = 'telegram_notify_config';

/** 保存时前端传此值表示不修改已有 Bot Token */
const BOT_TOKEN_UNCHANGED = '__KEEP__';

const DEFAULT_TELEGRAM_NOTIFY_CONFIG = Object.freeze({
  enabled: false,
  botToken: '',
  adminChatId: '',
  parseMode: 'HTML',
  includeOrderItems: true,
  maxMessageLength: 3900,
  adminFrontendUrl: '',
});

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
  return {
    enabled: String(process.env.TELEGRAM_ENABLED || '').toLowerCase() === 'true',
    botToken: String(process.env.TELEGRAM_BOT_TOKEN || '').trim(),
    adminChatId: String(process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim(),
    parseMode: String(process.env.TELEGRAM_PARSE_MODE || 'HTML').trim() || 'HTML',
    includeOrderItems: String(process.env.TELEGRAM_INCLUDE_ORDER_ITEMS || 'true').toLowerCase() !== 'false',
    maxMessageLength: Number(process.env.TELEGRAM_MAX_MESSAGE_LENGTH || 3900) || 3900,
    adminFrontendUrl: String(process.env.ADMIN_FRONTEND_URL || process.env.PUBLIC_APP_URL || '').trim(),
  };
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
  return {
    enabled: source.enabled === true || source.enabled === 'true' || source.enabled === 1 || source.enabled === '1',
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
    enabled: stored.enabled,
    botToken: stored.botToken || env.botToken,
    adminChatId: stored.adminChatId || env.adminChatId,
    parseMode: stored.parseMode || env.parseMode,
    includeOrderItems: stored.includeOrderItems,
    maxMessageLength: stored.maxMessageLength,
    adminFrontendUrl: stored.adminFrontendUrl || env.adminFrontendUrl,
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
    enabled: normalized.enabled,
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
  readEnvTelegramConfig,
  parseStoredConfig,
  normalizeTelegramNotifyConfig,
  mergeTelegramNotifyConfig,
  maskBotToken,
  toAdminSettingsView,
  resolveBotTokenOnSave,
};

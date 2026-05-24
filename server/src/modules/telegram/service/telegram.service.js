const repo = require('../repository/telegram.repository');
const templates = require('../telegram.templates');
function getAdminApi() {
  return /** @type {any} */ (require('../../admin')).api || {};
}

function getSiteCapabilitiesApi() {
  return /** @type {any} */ (require('../../siteCapabilities')).api || {};
}
const { writeAuditLog } = require('../../../utils/auditLog');
const {
  SETTING_KEY,
  BOT_TOKEN_UNCHANGED,
  readEnvTelegramConfig,
  parseStoredConfig,
  normalizeTelegramNotifyConfig,
  mergeTelegramNotifyConfig,
  toAdminSettingsView,
  resolveBotTokenOnSave,
} = require('../../../utils/telegramNotifyConfig');

const EVENT_PAYMENT_SUCCESS = 'payment_success';

let configCache = null;

function invalidateConfigCache() {
  configCache = null;
}

async function loadConfig() {
  if (configCache) return configCache;
  const raw = await getAdminApi().selectSiteSettingValue(SETTING_KEY);
  const stored = parseStoredConfig(raw);
  const merged = mergeTelegramNotifyConfig(readEnvTelegramConfig(), stored);
  configCache = {
    enabled: merged.enabled,
    botToken: merged.botToken,
    adminChatId: merged.adminChatId,
    parseMode: merged.parseMode,
    includeItems: merged.includeOrderItems,
    maxMessageLength: merged.maxMessageLength,
    adminFrontendUrl: merged.adminFrontendUrl,
    configSource: merged.configSource,
  };
  return configCache;
}

/** @deprecated 使用 loadConfig；保留给旧调用方 */
function readConfig() {
  if (configCache) {
    const c = configCache;
    return {
      enabled: c.enabled,
      botToken: c.botToken,
      adminChatId: c.adminChatId,
      parseMode: c.parseMode,
      includeItems: c.includeItems,
      maxMessageLength: c.maxMessageLength,
      adminFrontendUrl: c.adminFrontendUrl,
    };
  }
  return readEnvTelegramConfig();
}

async function getStatus() {
  const config = await loadConfig();
  return {
    enabled: config.enabled,
    botTokenConfigured: !!config.botToken,
    adminChatIdConfigured: !!config.adminChatId,
    parseMode: config.parseMode,
    includeOrderItems: config.includeItems,
    maxMessageLength: config.maxMessageLength,
    adminFrontendUrlConfigured: !!config.adminFrontendUrl,
    configSource: config.configSource,
  };
}

async function getAdminSettings() {
  const config = await loadConfig();
  return toAdminSettingsView(config);
}

async function saveAdminSettings(body, adminUserId, req) {
  const before = await getAdminSettings();
  const current = await loadConfig();
  const normalized = normalizeTelegramNotifyConfig(body);
  normalized.botToken = resolveBotTokenOnSave(body?.botToken, current.botToken);

  await getAdminApi().upsertSiteSetting(SETTING_KEY, JSON.stringify(normalized));
  invalidateConfigCache();

  const caps = await getSiteCapabilitiesApi().getSiteCapabilities();
  await getSiteCapabilitiesApi().saveSiteCapabilities({
    ...caps,
    telegramOrderNotifyEnabled: normalized.enabled,
  });

  const after = await getAdminSettings();
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'settings.telegram_update',
    objectType: 'site_settings',
    objectId: SETTING_KEY,
    summary: '更新 Telegram 通知设置',
    before,
    after,
    result: 'success',
  });
  return after;
}

function buildSampleOrderSnapshot() {
  return {
    order: {
      id: 'preview-order-id',
      orderNo: 'ORD202605200001',
      customerName: '张三',
      contactPhone: '60123456789',
      shippingAddress: '12, Jalan Bukit Bintang, Kuala Lumpur, 55100, Malaysia',
      totalAmount: 128.5,
      paymentMethod: 'online',
      paymentChannel: 'stripe',
      paymentStatus: 'paid',
      status: 'paid',
      createdAt: new Date(),
      paidAt: new Date(),
    },
    items: [
      {
        productName: '示例商品 A',
        skuName: '红色 / L',
        skuCode: 'SKU-A-RED-L',
        quantity: 2,
        unitPrice: 39.9,
        lineTotal: 79.8,
      },
      {
        productName: '示例商品 B',
        skuName: '默认规格',
        skuCode: 'SKU-B-DEFAULT',
        quantity: 1,
        unitPrice: 48.7,
        lineTotal: 48.7,
      },
    ],
  };
}

async function buildMessagePreview(overrides = {}) {
  const config = await loadConfig();
  const merged = normalizeTelegramNotifyConfig({
    includeOrderItems: overrides.includeOrderItems ?? config.includeItems,
    maxMessageLength: overrides.maxMessageLength ?? config.maxMessageLength,
    adminFrontendUrl: overrides.adminFrontendUrl ?? config.adminFrontendUrl,
    parseMode: overrides.parseMode ?? config.parseMode,
  });
  const snapshot = buildSampleOrderSnapshot();
  const adminOrderUrl = await buildAdminOrderUrl(snapshot.order.id, snapshot.order.orderNo);
  const messages = templates.splitPaymentSuccessMessage(snapshot, {
    includeItems: merged.includeOrderItems,
    maxLength: merged.maxMessageLength,
    adminOrderUrl,
    source: 'preview',
  });
  return {
    eventType: EVENT_PAYMENT_SUCCESS,
    parseMode: merged.parseMode,
    totalParts: messages.length,
    messages,
    sampleOrderNo: snapshot.order.orderNo,
  };
}

async function buildAdminOrderUrl(orderId, orderNo) {
  const config = await loadConfig();
  const base = String(config.adminFrontendUrl || '').replace(/\/$/, '');
  if (!base) return `/admin/orders?keyword=${encodeURIComponent(orderNo || orderId)}`;
  return `${base}/admin/orders?keyword=${encodeURIComponent(orderNo || orderId)}`;
}

function safeErrorMessage(error, botToken = '') {
  const msg = String(error?.message || error || 'Unknown error');
  const token = String(botToken || '').trim();
  return token ? msg.replaceAll(token, '[redacted]') : msg;
}

async function sendMessage(chatId, text, options = {}) {
  const config = await loadConfig();
  const token = config.botToken;
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12_000);
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || config.parseMode,
        disable_web_page_preview: true,
      }),
    });
    const data = /** @type {any} */ (await response.json().catch(() => ({})));
    if (!response.ok || data.ok === false) {
      throw new Error(data.description || `Telegram API error: ${response.status}`);
    }
    return data.result?.message_id ? String(data.result.message_id) : '';
  } finally {
    clearTimeout(timeout);
  }
}

async function writeLog({
  orderId, eventType, status, messageContent = '', providerMessageId = '', errorMessage = '',
}) {
  const config = await loadConfig();
  await repo.insertNotificationLog({
    targetId: config.adminChatId,
    orderId,
    eventType,
    messageContent,
    sendStatus: status,
    providerMessageId,
    errorMessage,
  }).catch((e) => {
    console.error('[Telegram] write notification log failed:', safeErrorMessage(e, config.botToken));
  });
}

async function notifyOrderPaid(orderId, source = '') {
  const eventType = EVENT_PAYMENT_SUCCESS;
  const config = await loadConfig();

  if (!(await getSiteCapabilitiesApi().isCapabilityEnabled('telegramOrderNotifyEnabled'))) {
    await writeLog({ orderId, eventType, status: 'skipped', errorMessage: 'Telegram feature disabled' });
    return { skipped: true, reason: 'feature_disabled' };
  }
  if (!config.enabled) {
    await writeLog({ orderId, eventType, status: 'skipped', errorMessage: 'Telegram disabled' });
    return { skipped: true, reason: 'disabled' };
  }
  if (!config.botToken) {
    await writeLog({ orderId, eventType, status: 'skipped', errorMessage: 'Telegram bot token not configured' });
    return { skipped: true, reason: 'missing_bot_token' };
  }
  if (!config.adminChatId) {
    await writeLog({ orderId, eventType, status: 'skipped', errorMessage: 'Telegram admin chat id not configured' });
    return { skipped: true, reason: 'missing_chat_id' };
  }

  let messageContentForLog = '';
  try {
    const alreadySent = await repo.hasSentTelegramEvent(orderId, eventType);
    if (alreadySent) {
      await writeLog({ orderId, eventType, status: 'skipped', errorMessage: 'Telegram payment_success already sent' });
      return { skipped: true, reason: 'already_sent' };
    }

    const snapshot = await repo.selectTelegramOrderSnapshot(orderId);
    if (!snapshot) {
      await writeLog({ orderId, eventType, status: 'failed', errorMessage: 'Order not found' });
      return { failed: true, reason: 'order_not_found' };
    }

    const adminOrderUrl = await buildAdminOrderUrl(orderId, snapshot.order?.orderNo);
    const messages = templates.splitPaymentSuccessMessage(snapshot, {
      includeItems: config.includeItems,
      maxLength: config.maxMessageLength,
      adminOrderUrl,
      source,
    });
    messageContentForLog = messages.join('\n\n---\n\n');
    const providerIds = [];
    for (const message of messages) {
      const id = await sendMessage(config.adminChatId, message, { parseMode: config.parseMode });
      if (id) providerIds.push(id);
    }
    await writeLog({
      orderId,
      eventType,
      status: 'sent',
      messageContent: messageContentForLog,
      providerMessageId: providerIds.join(','),
    });
    return { sent: true, count: messages.length };
  } catch (error) {
    await writeLog({
      orderId,
      eventType,
      status: 'failed',
      messageContent: messageContentForLog,
      errorMessage: safeErrorMessage(error, config.botToken),
    });
    console.error('[Telegram] notify order paid failed:', safeErrorMessage(error, config.botToken));
    return { failed: true, error: safeErrorMessage(error, config.botToken) };
  }
}

async function sendTestMessage() {
  const config = await loadConfig();
  if (!config.enabled) throw new Error('Telegram 未开启，请先在下方保存并启用');
  if (!config.botToken) throw new Error('Telegram Bot Token 未配置');
  if (!config.adminChatId) throw new Error('Telegram 管理员 Chat ID 未配置');
  const text = '✅ Telegram 通知测试成功\n\n如果你看到这条消息，说明订单通知已经可以正常发送。';
  const providerMessageId = await sendMessage(config.adminChatId, text, { parseMode: config.parseMode });
  await repo.insertNotificationLog({
    targetId: config.adminChatId,
    eventType: 'test',
    messageContent: text,
    sendStatus: 'sent',
    providerMessageId,
  });
  return { providerMessageId };
}

async function listLogs(limit) {
  return repo.listTelegramLogs(limit);
}

module.exports = {
  EVENT_PAYMENT_SUCCESS,
  BOT_TOKEN_UNCHANGED,
  invalidateConfigCache,
  loadConfig,
  readConfig,
  getStatus,
  getAdminSettings,
  saveAdminSettings,
  buildMessagePreview,
  sendMessage,
  notifyOrderPaid,
  sendTestMessage,
  listLogs,
  buildAdminOrderUrl,
  buildSampleOrderSnapshot,
  maskPhoneLast5: templates.maskPhoneLast5,
  formatMoney: templates.formatMoney,
  formatDateTime: templates.formatDateTime,
};

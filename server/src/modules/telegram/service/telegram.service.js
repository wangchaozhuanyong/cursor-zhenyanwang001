const repo = require('../repository/telegram.repository');
const templates = require('../telegram.templates');
function getAdminApi() {
  return /** @type {any} */ (require('../../admin/publicApi')) || {};
}

function getSiteCapabilitiesApi() {
  return /** @type {any} */ (require('../../siteCapabilities/publicApi')) || {};
}
const { writeAuditLog } = require('../../../utils/auditLog');
const { BusinessError, ValidationError } = require('../../../errors');
const {
  SETTING_KEY,
  BOT_TOKEN_UNCHANGED,
  readEnvTelegramConfig,
  parseStoredConfig,
  normalizeTelegramNotifyConfig,
  mergeTelegramNotifyConfig,
  toAdminSettingsView,
  resolveBotTokenOnSave,
  buildAdminOrderUrl: buildAdminOrderUrlFromConfig,
} = require('../../../utils/telegramNotifyConfig');
const {
  formatTelegramEscalationText,
  formatTelegramEventAlertText,
} = require('../../../utils/adminEventLabels');

const EVENT_PAYMENT_SUCCESS = 'payment_success';
const EVENT_ADMIN_ALERT = 'admin_event_alert';
const EVENT_ADMIN_ESCALATION = 'admin_event_escalation';
/** 付款成功模板仅做 HTML 转义，实际发送固定 HTML，避免 Markdown 模式解析失败 */
const ORDER_MESSAGE_PARSE_MODE = 'HTML';

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
    enabled: merged.orderNotifyEnabled,
    orderNotifyEnabled: merged.orderNotifyEnabled,
    eventNotifyEnabled: merged.eventNotifyEnabled,
    eventNotifyImmediate: merged.eventNotifyImmediate,
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

async function getStatus() {
  const config = await loadConfig();
  return {
    enabled: config.orderNotifyEnabled,
    orderNotifyEnabled: config.orderNotifyEnabled,
    eventNotifyEnabled: config.eventNotifyEnabled,
    eventNotifyImmediate: config.eventNotifyImmediate,
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
    telegramOrderNotifyEnabled: normalized.orderNotifyEnabled,
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

/** 与「功能开关」页 telegramOrderNotifyEnabled 双向同步（仅更新 enabled，保留已存 Token 等字段） */
async function syncOrderNotifyEnabled(enabled) {
  const enabledFlag = enabled === true || enabled === 'true' || enabled === 1 || enabled === '1';
  const raw = await getAdminApi().selectSiteSettingValue(SETTING_KEY);
  const stored = /** @type {any} */ (parseStoredConfig(raw) || {});
  const envMerged = /** @type {any} */ (mergeTelegramNotifyConfig(readEnvTelegramConfig(), Object.keys(stored).length ? stored : null));
  const next = normalizeTelegramNotifyConfig({
    enabled: enabledFlag,
    orderNotifyEnabled: enabledFlag,
    eventNotifyEnabled: stored.eventNotifyEnabled ?? envMerged.eventNotifyEnabled,
    eventNotifyImmediate: stored.eventNotifyImmediate ?? envMerged.eventNotifyImmediate,
    botToken: stored.botToken || '',
    adminChatId: stored.adminChatId || envMerged.adminChatId,
    parseMode: stored.parseMode || envMerged.parseMode,
    includeOrderItems: stored.includeOrderItems ?? envMerged.includeOrderItems,
    maxMessageLength: stored.maxMessageLength ?? envMerged.maxMessageLength,
    adminFrontendUrl: stored.adminFrontendUrl || envMerged.adminFrontendUrl,
  });
  await getAdminApi().upsertSiteSetting(SETTING_KEY, JSON.stringify(next));
  invalidateConfigCache();
  return { orderNotifyEnabled: next.orderNotifyEnabled };
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
      paymentMethod: '在线支付',
      paymentChannel: 'Stripe',
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
    parseMode: ORDER_MESSAGE_PARSE_MODE,
    totalParts: messages.length,
    messages,
    sampleOrderNo: snapshot.order.orderNo,
  };
}

async function buildAdminOrderUrl(orderId, orderNo) {
  const config = await loadConfig();
  return buildAdminOrderUrlFromConfig(config.adminFrontendUrl, orderId, orderNo);
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
    const parseMode = options.parseMode !== undefined ? options.parseMode : config.parseMode;
    const payload = {
      chat_id: chatId,
      text,
      disable_web_page_preview: true,
    };
    if (parseMode) payload.parse_mode = parseMode;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify(payload),
    });
    const data = /** @type {any} */ (await response.json().catch(() => ({})));
    if (!response.ok || data.ok === false) {
      const detail = data.description || `Telegram 接口错误：${response.status}`;
      throw new BusinessError(400, detail);
    }
    return data.result?.message_id ? String(data.result.message_id) : '';
  } catch (error) {
    if (error instanceof BusinessError) throw error;
    if (error?.name === 'AbortError') {
      throw new BusinessError(504, 'Telegram 请求超时，请稍后重试');
    }
    throw new BusinessError(400, safeErrorMessage(error, token));
  } finally {
    clearTimeout(timeout);
  }
}

/** @param {any} args */
async function writeLog(args = {}) {
  const {
    orderId,
    eventType,
    status,
    messageContent = '',
    providerMessageId = '',
    errorMessage = '',
    targetId,
  } = args || {};
  const config = await loadConfig();
  await repo.insertNotificationLog({
    targetId: targetId || config.adminChatId,
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
    await writeLog({ orderId, eventType, status: 'skipped', errorMessage: '站点未开启 Telegram 订单通知' });
    return { skipped: true, reason: 'feature_disabled' };
  }
  if (!config.orderNotifyEnabled) {
    await writeLog({ orderId, eventType, status: 'skipped', errorMessage: '订单 Telegram 通知未启用' });
    return { skipped: true, reason: 'order_notify_disabled' };
  }
  if (!config.botToken) {
    await writeLog({ orderId, eventType, status: 'skipped', errorMessage: '未配置 Bot Token' });
    return { skipped: true, reason: 'missing_bot_token' };
  }
  if (!config.adminChatId) {
    await writeLog({ orderId, eventType, status: 'skipped', errorMessage: '未配置管理员 Chat ID' });
    return { skipped: true, reason: 'missing_chat_id' };
  }

  let messageContentForLog = '';
  try {
    const alreadySent = await repo.hasSentTelegramEvent(orderId, eventType);
    if (alreadySent) {
      await writeLog({ orderId, eventType, status: 'skipped', errorMessage: '该订单付款通知已发送过' });
      return { skipped: true, reason: 'already_sent' };
    }

    const snapshot = await repo.selectTelegramOrderSnapshot(orderId);
    if (!snapshot) {
      await writeLog({ orderId, eventType, status: 'failed', errorMessage: '订单不存在' });
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
      const id = await sendMessage(config.adminChatId, message, { parseMode: ORDER_MESSAGE_PARSE_MODE });
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

async function assertTelegramConnection(config) {
  if (!config.botToken) {
    throw new ValidationError('Telegram Bot Token 未配置，请填写后保存再测试');
  }
  if (!config.adminChatId) {
    throw new ValidationError('Telegram 管理员 Chat ID 未配置，请填写后保存再测试');
  }
}

async function sendAdminEventTelegram(eventRow, options = {}) {
  const kind = options.kind === 'escalation' ? 'escalation' : 'alert';
  const config = await loadConfig();
  const logEventType = kind === 'escalation' ? EVENT_ADMIN_ESCALATION : EVENT_ADMIN_ALERT;
  const entityId = eventRow?.id ? String(eventRow.id) : null;

  if (!config.eventNotifyEnabled) {
    await writeLog({
      orderId: null,
      eventType: logEventType,
      status: 'skipped',
      errorMessage: '后台事件 Telegram 通知未启用',
      targetId: entityId,
    });
    return { skipped: true, reason: 'event_notify_disabled' };
  }
  if (kind === 'alert' && !config.eventNotifyImmediate) {
    await writeLog({
      orderId: null,
      eventType: logEventType,
      status: 'skipped',
      errorMessage: '未开启 P0/P1 新事件即时提醒',
      targetId: entityId,
    });
    return { skipped: true, reason: 'event_immediate_disabled' };
  }
  if (!config.botToken || !config.adminChatId) {
    await writeLog({
      orderId: null,
      eventType: logEventType,
      status: 'skipped',
      errorMessage: '未配置 Bot Token 或 Chat ID',
      targetId: entityId,
    });
    return { skipped: true, reason: 'telegram_not_configured' };
  }

  const text = kind === 'escalation'
    ? formatTelegramEscalationText(eventRow)
    : formatTelegramEventAlertText(eventRow);

  try {
    const providerMessageId = await sendMessage(config.adminChatId, text, { parseMode: undefined });
    await writeLog({
      orderId: null,
      eventType: logEventType,
      status: 'sent',
      messageContent: text,
      providerMessageId,
      targetId: entityId,
    });
    return { sent: true, providerMessageId };
  } catch (error) {
    await writeLog({
      orderId: null,
      eventType: logEventType,
      status: 'failed',
      messageContent: text,
      errorMessage: safeErrorMessage(error, config.botToken),
      targetId: entityId,
    });
    throw error;
  }
}

async function notifyAdminEventAlert(eventRow) {
  return sendAdminEventTelegram(eventRow, { kind: 'alert' });
}

async function notifyAdminEventEscalation(eventRow) {
  return sendAdminEventTelegram(eventRow, { kind: 'escalation' });
}

async function sendTestMessage() {
  const config = await loadConfig();
  await assertTelegramConnection(config);
  const text = '✅ Telegram 通知测试成功\n\n如果你看到这条消息，说明 Bot 与 Chat ID 配置正确，可以接收订单与后台事件通知。';
  // 测试消息使用纯文本，避免 Markdown/MarkdownV2 转义导致 Telegram 400
  const providerMessageId = await sendMessage(config.adminChatId, text, { parseMode: undefined });
  try {
    await repo.insertNotificationLog({
      targetId: config.adminChatId,
      eventType: 'test',
      messageContent: text,
      sendStatus: 'sent',
      providerMessageId,
    });
  } catch (logErr) {
    console.error('[Telegram] test send log failed:', safeErrorMessage(logErr, config.botToken));
  }
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
  getStatus,
  getAdminSettings,
  saveAdminSettings,
  syncOrderNotifyEnabled,
  buildMessagePreview,
  sendMessage,
  notifyOrderPaid,
  notifyAdminEventAlert,
  notifyAdminEventEscalation,
  sendTestMessage,
  listLogs,
  buildAdminOrderUrl,
  buildSampleOrderSnapshot,
  maskPhoneLast5: templates.maskPhoneLast5,
  formatMoney: templates.formatMoney,
  formatDateTime: templates.formatDateTime,
};

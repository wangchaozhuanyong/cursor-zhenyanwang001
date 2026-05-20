const repo = require('../repository/telegram.repository');
const templates = require('../telegram.templates');

const EVENT_PAYMENT_SUCCESS = 'payment_success';

function readConfig() {
  const enabled = String(process.env.TELEGRAM_ENABLED || '').toLowerCase() === 'true';
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const adminChatId = String(process.env.TELEGRAM_ADMIN_CHAT_ID || '').trim();
  const parseMode = String(process.env.TELEGRAM_PARSE_MODE || 'HTML').trim() || 'HTML';
  const includeItems = String(process.env.TELEGRAM_INCLUDE_ORDER_ITEMS || 'true').toLowerCase() !== 'false';
  const maxMessageLength = Number(process.env.TELEGRAM_MAX_MESSAGE_LENGTH || 3900) || 3900;
  const adminFrontendUrl = String(process.env.ADMIN_FRONTEND_URL || process.env.PUBLIC_APP_URL || '').trim();
  return {
    enabled,
    botToken,
    adminChatId,
    parseMode,
    includeItems,
    maxMessageLength,
    adminFrontendUrl,
  };
}

function getStatus() {
  const config = readConfig();
  return {
    enabled: config.enabled,
    botTokenConfigured: !!config.botToken,
    adminChatIdConfigured: !!config.adminChatId,
    parseMode: config.parseMode,
    includeOrderItems: config.includeItems,
    maxMessageLength: config.maxMessageLength,
    adminFrontendUrlConfigured: !!config.adminFrontendUrl,
  };
}

function buildAdminOrderUrl(orderId, orderNo) {
  const config = readConfig();
  const base = config.adminFrontendUrl.replace(/\/$/, '');
  if (!base) return `/admin/orders?keyword=${encodeURIComponent(orderNo || orderId)}`;
  return `${base}/admin/orders?keyword=${encodeURIComponent(orderNo || orderId)}`;
}

function safeErrorMessage(error) {
  const msg = String(error?.message || error || 'Unknown error');
  const token = String(process.env.TELEGRAM_BOT_TOKEN || '').trim();
  return token ? msg.replaceAll(token, '[redacted]') : msg;
}

async function sendMessage(chatId, text, options = {}) {
  const config = readConfig();
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

async function writeLog({ orderId, eventType, status, messageContent = '', providerMessageId = '', errorMessage = '' }) {
  await repo.insertNotificationLog({
    targetId: readConfig().adminChatId,
    orderId,
    eventType,
    messageContent,
    sendStatus: status,
    providerMessageId,
    errorMessage,
  }).catch((e) => {
    console.error('[Telegram] write notification log failed:', safeErrorMessage(e));
  });
}

async function notifyOrderPaid(orderId, source = '') {
  const eventType = EVENT_PAYMENT_SUCCESS;
  const config = readConfig();

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

    const adminOrderUrl = buildAdminOrderUrl(orderId, snapshot.order?.orderNo);
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
      errorMessage: safeErrorMessage(error),
    });
    console.error('[Telegram] notify order paid failed:', safeErrorMessage(error));
    return { failed: true, error: safeErrorMessage(error) };
  }
}

async function sendTestMessage() {
  const config = readConfig();
  if (!config.enabled) throw new Error('Telegram 未开启');
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
  readConfig,
  getStatus,
  sendMessage,
  notifyOrderPaid,
  sendTestMessage,
  listLogs,
  buildAdminOrderUrl,
  maskPhoneLast5: templates.maskPhoneLast5,
  formatMoney: templates.formatMoney,
  formatDateTime: templates.formatDateTime,
};

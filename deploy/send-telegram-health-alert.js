#!/usr/bin/env node
const path = require('path');
const db = require(path.join(__dirname, '..', 'server', 'src', 'config', 'db'));
const {
  SETTING_KEY,
  parseStoredConfig,
  readEnvTelegramConfig,
  mergeTelegramNotifyConfig,
} = require(path.join(__dirname, '..', 'server', 'src', 'utils', 'telegramNotifyConfig'));

async function main() {
  const alertMessage = String(process.env.ALERT_MESSAGE || process.argv.slice(2).join(' ') || '').trim();
  if (!alertMessage) {
    console.error('ALERT_MESSAGE is required');
    process.exit(1);
  }

  try {
    const [[row]] = await db.query(
      'SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
      [SETTING_KEY],
    );
    const stored = parseStoredConfig(row?.setting_value);
    const config = mergeTelegramNotifyConfig(readEnvTelegramConfig(), stored);
    if (!config.botToken || !config.adminChatId) {
      console.error('Telegram bot token or chat id is not configured');
      process.exitCode = 2;
      return;
    }

    const text = alertMessage.length > 3900 ? `${alertMessage.slice(0, 3900)}...` : alertMessage;
    const url = `https://api.telegram.org/bot${config.botToken}/sendMessage`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8_000);
    let response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          chat_id: config.adminChatId,
          text,
          disable_web_page_preview: true,
        }),
      });
    } finally {
      clearTimeout(timeout);
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.ok === false) {
      const detail = data.description || `Telegram API error: ${response.status}`;
      console.error(detail);
      process.exitCode = 3;
      return;
    }
    console.log(data.result?.message_id ? `sent:${data.result.message_id}` : 'sent');
  } finally {
    await db.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});

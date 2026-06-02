#!/usr/bin/env node
const path = require('path');
const db = require(path.join(__dirname, '..', 'server', 'src', 'config', 'db'));
const {
  SETTING_KEY,
  parseStoredConfig,
  readEnvTelegramConfig,
  mergeTelegramNotifyConfig,
} = require(path.join(__dirname, '..', 'server', 'src', 'utils', 'telegramNotifyConfig'));

function formatCnDateTime(value) {
  if (!value) return '-';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  const parts = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}年${parts.month}月${parts.day}日 ${parts.hour}:${parts.minute}:${parts.second}（北京时间）`;
}

function normalizeHealthAlertMessage(message) {
  const text = String(message || '').trim();
  const match = text.match(
    /^ALERT:\s*production health check failed on\s+(.+?)\s+at\s+(.+?)\.\s*API_BASE_URL=(.+?),\s*PM2_APP=(.+)$/i,
  );
  if (!match) return text;
  return [
    '【生产健康检查失败】',
    `服务器：${match[1].trim() || '-'}`,
    `检查时间：${formatCnDateTime(match[2].trim())}`,
    `API 地址（API_BASE_URL）：${match[3].trim() || '-'}`,
    `PM2 进程（PM2_APP）：${match[4].trim() || '-'}`,
    '处理建议：请检查 /api/health/live、/api/health/ready、PM2 状态、Nginx 日志和服务器资源。',
  ].join('\n');
}

async function main() {
  const rawAlertMessage = String(process.env.ALERT_MESSAGE || process.argv.slice(2).join(' ') || '').trim();
  if (!rawAlertMessage) {
    console.error('ALERT_MESSAGE 不能为空');
    process.exit(1);
  }
  const alertMessage = normalizeHealthAlertMessage(rawAlertMessage);

  try {
    const [[row]] = await db.query(
      'SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
      [SETTING_KEY],
    );
    const stored = parseStoredConfig(row?.setting_value);
    const config = mergeTelegramNotifyConfig(readEnvTelegramConfig(), stored);
    if (!config.botToken || !config.adminChatId) {
      console.error('未配置 Telegram Bot Token 或管理员 Chat ID');
      process.exitCode = 2;
      return;
    }

    const text = alertMessage.length > 3900 ? `${alertMessage.slice(0, 3899)}…` : alertMessage;
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
      const detail = data.description || `Telegram 接口错误：${response.status}`;
      console.error(detail);
      process.exitCode = 3;
      return;
    }
    console.log(data.result?.message_id ? `已发送：${data.result.message_id}` : '已发送');
  } finally {
    await db.end().catch(() => {});
  }
}

main().catch((error) => {
  console.error(error?.stack || error?.message || String(error));
  process.exit(1);
});

const telegramModule = require('../../telegram');

function getTelegramApi() {
  return /** @type {any} */ (telegramModule).api || {};
}

function requireTelegramApi(name) {
  const fn = getTelegramApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Telegram module API missing method: ${name}`);
  }
  return fn;
}

async function getStatus() {
  return requireTelegramApi('getStatus')();
}

async function getSettings() {
  return requireTelegramApi('getAdminSettings')();
}

async function updateSettings(body, adminUserId, req) {
  return requireTelegramApi('saveAdminSettings')(body, adminUserId, req);
}

async function previewMessage(body) {
  return requireTelegramApi('buildMessagePreview')(body || {});
}

async function testSend() {
  return requireTelegramApi('sendTestMessage')();
}

async function listLogs(query = {}) {
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return requireTelegramApi('listLogs')(limit);
}

module.exports = {
  getStatus,
  getSettings,
  updateSettings,
  previewMessage,
  testSend,
  listLogs,
};

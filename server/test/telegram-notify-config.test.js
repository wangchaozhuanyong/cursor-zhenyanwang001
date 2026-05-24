const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  BOT_TOKEN_UNCHANGED,
  normalizeTelegramNotifyConfig,
  mergeTelegramNotifyConfig,
  resolveBotTokenOnSave,
  maskBotToken,
} = require('../src/utils/telegramNotifyConfig');

test('normalizeTelegramNotifyConfig clamps message length', () => {
  const cfg = normalizeTelegramNotifyConfig({ maxMessageLength: 99999, enabled: true });
  assert.equal(cfg.maxMessageLength, 4096);
});

test('resolveBotTokenOnSave keeps existing token when unchanged', () => {
  assert.equal(resolveBotTokenOnSave('', 'secret-token'), 'secret-token');
  assert.equal(resolveBotTokenOnSave(BOT_TOKEN_UNCHANGED, 'secret-token'), 'secret-token');
  assert.equal(resolveBotTokenOnSave('new-token', 'secret-token'), 'new-token');
});

test('mergeTelegramNotifyConfig prefers database values', () => {
  const merged = mergeTelegramNotifyConfig(
    { orderNotifyEnabled: false, botToken: 'env-token', adminChatId: 'env-chat' },
    { orderNotifyEnabled: true, eventNotifyEnabled: true, botToken: 'db-token', adminChatId: '' },
  );
  assert.equal(merged.orderNotifyEnabled, true);
  assert.equal(merged.eventNotifyEnabled, true);
  assert.equal(merged.botToken, 'db-token');
  assert.equal(merged.adminChatId, 'env-chat');
});

test('normalizeTelegramNotifyConfig splits order and event notify flags', () => {
  const legacy = normalizeTelegramNotifyConfig({ enabled: true, eventNotifyEnabled: true });
  assert.equal(legacy.orderNotifyEnabled, true);
  assert.equal(legacy.eventNotifyEnabled, true);

  const explicit = normalizeTelegramNotifyConfig({
    orderNotifyEnabled: false,
    eventNotifyEnabled: true,
    eventNotifyImmediate: false,
  });
  assert.equal(explicit.orderNotifyEnabled, false);
  assert.equal(explicit.eventNotifyEnabled, true);
  assert.equal(explicit.eventNotifyImmediate, false);
});

test('maskBotToken hides middle segment', () => {
  assert.match(maskBotToken('1234567890abcdef'), /…/);
});

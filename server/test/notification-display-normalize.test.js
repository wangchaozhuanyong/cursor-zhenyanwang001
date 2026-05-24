const test = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeLegacyNotificationDisplay,
  isLegacyEnglishOrderShipCopy,
} = require('../src/utils/notificationDisplayNormalize');

test('normalize legacy order shipped notification copy', () => {
  const result = normalizeLegacyNotificationDisplay(
    'Order shipped',
    'Order #55617422 has shipped. Carrier: 测试, Tracking: 12233333.',
  );
  assert.equal(result.title, '订单已发货');
  assert.equal(result.content, '订单 55617422 已发货。承运商：测试，物流单号：12233333。');
});

test('detect legacy english order ship trigger copy', () => {
  assert.equal(isLegacyEnglishOrderShipCopy('title', 'Order shipped'), true);
  assert.equal(
    isLegacyEnglishOrderShipCopy('content', 'Order #55617422 has shipped. Carrier: 测试, Tracking: 12233333.'),
    true,
  );
  assert.equal(isLegacyEnglishOrderShipCopy('title', '订单已发货'), false);
});

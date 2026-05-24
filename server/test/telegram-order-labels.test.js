const { test } = require('node:test');
const assert = require('node:assert/strict');
const templates = require('../src/modules/telegram/telegram.templates');
const {
  labelTelegramPaymentMethod,
  labelTelegramPaymentChannel,
  formatTelegramShippingAddress,
} = require('../src/utils/telegramOrderLabels');

test('labelTelegramPaymentMethod 映射 mock 等枚举', () => {
  assert.equal(labelTelegramPaymentMethod('mock'), '模拟支付（测试）');
  assert.equal(labelTelegramPaymentMethod('reward_wallet'), '返现钱包');
  assert.equal(labelTelegramPaymentMethod('online'), '在线支付');
  assert.equal(labelTelegramPaymentMethod('', 'points_gift'), '未填写');
});

test('labelTelegramPaymentChannel 空值为未填写', () => {
  assert.equal(labelTelegramPaymentChannel(''), '未填写');
  assert.equal(labelTelegramPaymentChannel('stripe_checkout'), 'Stripe 在线结账');
});

test('formatTelegramShippingAddress 国家代码转中文', () => {
  assert.equal(formatTelegramShippingAddress('测试地址, MY'), '测试地址，马来西亚');
  assert.equal(
    formatTelegramShippingAddress('12, Jalan Bukit, Kuala Lumpur, 55100, MY'),
    '12，Jalan Bukit，Kuala Lumpur，55100，马来西亚',
  );
});

test('splitPaymentSuccessMessage 不含原始 mock/MY 英文枚举', () => {
  const messages = templates.splitPaymentSuccessMessage({
    order: {
      orderNo: '42522149',
      customerName: '流程验证',
      contactPhone: '60120823',
      totalAmount: 15000,
      paymentMethod: '模拟支付（测试）',
      paymentChannel: '未填写',
      paidAt: new Date('2026-05-24T05:56:00.000Z'),
      shippingAddress: '测试地址，马来西亚',
    },
    items: [{
      productName: '签证服务，东马工作签证办理。',
      skuName: '默认规格',
      skuCode: '',
      quantity: 1,
      unitPrice: 15000,
      lineTotal: 15000,
    }],
  }, {
    adminOrderUrl: 'https://damatong.net/admin/orders?keyword=%2342522149',
  });

  const body = messages.join('\n');
  assert.match(body, /支付方式：模拟支付（测试）/);
  assert.match(body, /支付渠道：未填写/);
  assert.match(body, /测试地址，马来西亚/);
  assert.doesNotMatch(body, /支付方式：mock/);
  assert.doesNotMatch(body, /, MY/);
});

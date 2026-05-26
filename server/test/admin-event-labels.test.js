const { test } = require('node:test');
const assert = require('node:assert/strict');
const { formatTelegramEscalationText, formatTelegramEventAlertText } = require('../src/utils/adminEventLabels');

test('formatTelegramEscalationText 使用中文标签与北京时间', () => {
  const text = formatTelegramEscalationText({
    severity: 'P1',
    title: '订单发货超时',
    escalation_target: 'admin_manager',
    status: 'open',
    event_type: 'order.ship_timeout',
    entity_type: 'order',
    entity_id: 'adf9ea60-e075-47dc-bd45-b2d0ca595314',
    category: 'order',
    message: '订单 #11260790 已付款后超过 1440 分钟仍未完成后续处理',
    payload: { orderNo: '11260790' },
    created_at: new Date('2026-05-21T15:19:30.000Z'),
  });

  assert.match(text, /【后台事件升级】P1 订单发货超时/);
  assert.match(text, /通知对象：运营主管/);
  assert.match(text, /当前状态：待处理/);
  assert.match(text, /事件类型：订单发货超时/);
  assert.match(text, /关联订单：#11260790/);
  assert.match(text, /说明：订单 #11260790/);
  assert.match(text, /2026年05月21日 23:19:30（北京时间）/);
  assert.doesNotMatch(text, /admin_manager/);
  assert.doesNotMatch(text, /order\.ship_timeout/);
  assert.doesNotMatch(text, /GMT/);
});

test('formatTelegramEventAlertText 新事件告警文案', () => {
  const text = formatTelegramEventAlertText({
    severity: 'P1',
    title: '订单发货超时',
    status: 'open',
    event_type: 'order.ship_timeout',
    category: 'order',
    message: '订单 #1 超时',
    created_at: new Date('2026-05-21T15:19:30.000Z'),
  });
  assert.match(text, /【后台事件告警】P1 订单发货超时/);
  assert.doesNotMatch(text, /通知对象/);
});

test('formatTelegramEventAlertText 安全事件使用类型中文标题', () => {
  const text = formatTelegramEventAlertText({
    severity: 'P1',
    title: 'Stripe 在线支付',
    status: 'ignored',
    event_type: 'security.payment_config_change',
    category: 'security',
    message: 'PUT /payments/channels/ch_stripe_checkout allowed',
    created_at: new Date('2026-05-24T14:04:30.000Z'),
  });
  assert.match(text, /支付配置变更/);
  assert.match(text, /更新支付渠道/);
  assert.doesNotMatch(text, /\bFavicon\b/);
  assert.doesNotMatch(text, /admin-users/);
});

test('formatTelegramEscalationText P0 默认通知负责人', () => {
  const text = formatTelegramEscalationText({
    severity: 'P0',
    title: 'Database unavailable',
    status: 'open',
    event_type: 'system.database_unavailable',
    category: 'system',
    message: 'ECONNREFUSED',
    created_at: '2026-01-02T04:00:00.000Z',
  });

  assert.match(text, /通知对象：负责人/);
  assert.match(text, /事件类型：数据库不可用/);
  assert.match(text, /无法连接目标服务/);
});

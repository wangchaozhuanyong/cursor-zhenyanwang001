/**
 * 站点功能开关：配置归一化与下单 schema（无需数据库）。
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  normalizeSiteCapabilities,
  DEFAULT_SITE_CAPABILITIES,
} = require('../src/config/siteCapabilities');
const { createOrderBodySchema } = require('../src/modules/order/schemas/order.schemas');

describe('site capabilities config', () => {
  test('normalize applies defaults and languageGateEnabled defaults to false', () => {
    const caps = normalizeSiteCapabilities({});
    assert.equal(caps.languageGateEnabled, false);
    assert.equal(caps.mallEnabled, true);
    assert.equal(caps.telegramOrderNotifyEnabled, true);
    assert.equal(caps.downloadConfirmEnabled, true);
    assert.deepEqual(Object.keys(caps).sort(), Object.keys(DEFAULT_SITE_CAPABILITIES).sort());
  });

  test('normalize coerces string booleans', () => {
    const caps = normalizeSiteCapabilities({ couponEnabled: 'false', pointsEnabled: '1' });
    assert.equal(caps.couponEnabled, false);
    assert.equal(caps.pointsEnabled, true);
  });
});

describe('createOrderBodySchema optional ids', () => {
  test('accepts omitted or null shipping_template_id (nullish)', () => {
    const base = {
      items: [{ product_id: 'p1', qty: 1 }],
      contact_name: 'Test',
      contact_phone: '0123456789',
    };
    const ok = createOrderBodySchema.safeParse({ ...base });
    assert.equal(ok.success, true);

    const withNull = createOrderBodySchema.safeParse({ ...base, shipping_template_id: null });
    assert.equal(withNull.success, true);
  });
});

/**
 * Online payment site capability must not block reward_wallet pay endpoint.
 */
require('./setupTestEnv').requireTestDatabase();
require('./_dbCleanup.test');
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');
const siteCapabilities = require('../src/modules/siteCapabilities/service/siteCapabilities.service');

function malaysiaTestPhone() {
  return `01${String(Date.now()).slice(-8)}`;
}

const TEST_PASSWORD = 'Secret12';
const phone = malaysiaTestPhone();
const countryCode = '+60';

describe('order pay vs onlinePaymentEnabled', () => {
  let accessToken;
  let orderId;
  let savedCapabilities;
  let productId;
  let variantId;

  before(async () => {
    savedCapabilities = await siteCapabilities.getSiteCapabilities();

    const reg = await request(app)
      .post('/api/auth/register')
      .send({ phone, countryCode, password: TEST_PASSWORD, nickname: 'pay-cap' })
      .expect(200);
    assert.equal(reg.body.code, 0);
    accessToken = reg.body.data?.token?.accessToken;
    assert.ok(accessToken);

    productId = randomUUID();
    variantId = randomUUID();
    await db.query(
      `INSERT INTO products
         (id, name, cover_image, images, price, points, stock, status, sort_order, description, is_recommended, is_new, is_hot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [productId, 'pay-cap-product', '', '[]', 9.9, 0, 10, 'active', 0, '', 0, 0, 0],
    );
    await db.query(
      `INSERT INTO product_variants
         (id, product_id, sku_code, title, price, stock, enabled, sort_order, is_default)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [variantId, productId, `PCAP-${Date.now()}`, 'Default', 9.9, 10, 1, 0, 1],
    );

    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId, qty: 1 })
      .expect(200);

    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        items: [{ product_id: productId, ...(variantId ? { variant_id: variantId } : {}), qty: 1 }],
        contact_name: 'Pay Cap',
        contact_phone: phone,
        address: 'Test address',
        payment_method: 'reward_wallet',
      });
    assert.equal(order.status, 200, JSON.stringify(order.body));
    assert.equal(order.body.code, 0, JSON.stringify(order.body));
    orderId = order.body.data.id;

    await siteCapabilities.saveSiteCapabilities({
      ...savedCapabilities,
      onlinePaymentEnabled: false,
    });
  });

  after(async () => {
    await siteCapabilities.saveSiteCapabilities(savedCapabilities);
    if (productId) {
      await db.query('DELETE FROM inventory_stock_records WHERE product_id = ?', [productId]).catch(() => {});
      await db.query('DELETE FROM product_variant_spec_values WHERE product_id = ?', [productId]).catch(() => {});
      await db.query('DELETE FROM product_variants WHERE product_id = ?', [productId]).catch(() => {});
      await db.query('DELETE FROM products WHERE id = ?', [productId]).catch(() => {});
    }
  });

  test('POST /api/orders/:id/pay reward_wallet is not blocked by online capability', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'reward_wallet' });
    assert.notEqual(res.status, 403, JSON.stringify(res.body));
    assert.notEqual(res.body?.message, '本站未启用在线支付');
  });

  test('POST /api/orders/:id/pay online channel is blocked when capability off', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ channel: 'online' });
    assert.equal(res.status, 403);
    assert.match(String(res.body?.message || ''), /在线支付/);
  });

  test('POST /api/orders/:id/stripe-checkout blocked when capability off', async () => {
    const res = await request(app)
      .post(`/api/orders/${orderId}/stripe-checkout`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});
    assert.equal(res.status, 403);
    assert.match(String(res.body?.message || ''), /在线支付/);
  });
});

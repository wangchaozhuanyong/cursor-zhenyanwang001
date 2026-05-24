/**
 * Local flow smoke:
 * register/login -> product/cart/order -> admin order operations -> user views.
 * Requires DB integration test environment from .env.test.
 */
require('./setupTestEnv').requireTestDatabase();
require('./_dbCleanup.test');
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');

const phone = `01${`${Date.now()}${process.pid}${Math.random().toString(36).slice(2, 9)}`.replace(/\D/g, '').slice(0, 8)}`;
const countryCode = '+60';
const storedPhone = `${countryCode}${phone.replace(/^0+/, '')}`;
const password = 'SmokeTest12';

let accessToken;
let productId;
let smokeProductId;
let orderId;
let shippingTemplateId;
let variantId;

function withAdminGatewayHeaders(req) {
  return req
    .set('Host', '127.0.0.1:3000')
    .set('Origin', 'http://127.0.0.1:3000')
    .set('Referer', 'http://127.0.0.1:3000/admin');
}

describe('local flow smoke', () => {
  before(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ phone, countryCode, password, nickname: 'smoke' });
    assert.ok(reg.status === 200 || reg.status === 409, `register failed: ${JSON.stringify(reg.body)}`);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ phone, countryCode, password })
      .expect(200);
    assert.equal(login.body.code, 0);
    accessToken = login.body.data.token.accessToken;

    const products = await request(app)
      .get('/api/products')
      .query({ pageSize: 50 })
      .expect(200);
    assert.equal(products.body.code, 0);
    // Use an isolated smoke product so this flow does not depend on shared catalog stock.
    const inStock = null;
    if (inStock) {
      productId = inStock.id;
    } else {
      smokeProductId = randomUUID();
      const smokeVariantId = randomUUID();
      await db.query(
        `INSERT INTO products
           (id, name, cover_image, images, price, points, stock, status, sort_order, description, is_recommended, is_new, is_hot)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          smokeProductId,
          'smoke-product',
          '',
          JSON.stringify([]),
          9.9,
          1,
          20,
          'active',
          0,
          'smoke test product',
          1,
          1,
          1,
        ],
      );
      await db.query(
        `INSERT INTO product_variants
           (id, product_id, sku_code, title, price, stock, enabled, sort_order, is_default)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [smokeVariantId, smokeProductId, `SMOKE-${Date.now()}`, 'Default', 9.9, 20, 1, 0, 1],
      );
      productId = smokeProductId;
      variantId = smokeVariantId;
    }

    let shipping = await request(app)
      .get('/api/shipping')
      .expect(200);
    assert.equal(shipping.body.code, 0);
    assert.ok(Array.isArray(shipping.body.data));

    if (shipping.body.data.length === 0) {
      shippingTemplateId = randomUUID();
      await db.query(
        `INSERT INTO shipping_templates (id, name, regions, base_fee, free_above, extra_per_kg, enabled)
         VALUES (?,?,?,?,?,?,?)`,
        [shippingTemplateId, 'smoke-template', '[]', 5, null, 1, 1],
      );
      shipping = await request(app)
        .get('/api/shipping')
        .expect(200);
      assert.equal(shipping.body.code, 0);
    }

    assert.ok(shipping.body.data.length > 0, 'shipping templates should not be empty');
    shippingTemplateId = shipping.body.data.some((t) => t.id === shippingTemplateId)
      ? shippingTemplateId
      : shipping.body.data[0].id;

    const detail = await request(app)
      .get(`/api/products/${productId}`)
      .expect(200);
    assert.equal(detail.body.code, 0);
    const variants = Array.isArray(detail.body.data?.variants) ? detail.body.data.variants : [];
    if (variants.length > 0) {
      const usable = variants.find((v) => Number(v?.stock ?? 0) > 0) || variants[0];
      variantId = usable?.id || usable?.variant_id || null;
    } else {
      variantId = null;
    }
    if (!variantId) {
      const [rows] = await db.query(
        'SELECT id FROM product_variants WHERE product_id = ? ORDER BY sort_order ASC, created_at ASC LIMIT 1',
        [productId],
      );
      variantId = rows?.[0]?.id || null;
    }

    const cart = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId, qty: 1 })
      .expect(200);
    assert.equal(cart.body.code, 0);

    const [[u]] = await db.query('SELECT id FROM users WHERE phone = ?', [storedPhone]);
    await db.query('UPDATE users SET role = ? WHERE id = ?', ['admin', u.id]);
    const [roleRows] = await db.query(
      `SELECT r.id
       FROM roles r
       JOIN role_permissions rp ON rp.role_id = r.id
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.code IN ('order.view', 'order.update', 'order.ship')
       GROUP BY r.id
       HAVING SUM(CASE WHEN p.code = 'order.view' THEN 1 ELSE 0 END) > 0
          AND SUM(CASE WHEN p.code = 'order.update' THEN 1 ELSE 0 END) > 0
          AND SUM(CASE WHEN p.code = 'order.ship' THEN 1 ELSE 0 END) > 0
       ORDER BY r.id
       LIMIT 1`,
    );
    const adminRoleId = roleRows?.[0]?.id || null;
    assert.ok(adminRoleId, 'missing RBAC role with order.view/order.update/order.ship');
    await db.query(
      'INSERT IGNORE INTO user_roles (user_id, role_id) VALUES (?, ?)',
      [u.id, adminRoleId],
    );

    const orderBody = {
      items: [{ product_id: productId, ...(variantId ? { variant_id: variantId } : {}), qty: 1 }],
      contact_name: 'Smoke Test',
      contact_phone: phone,
      address: 'Smoke test address',
      payment_method: 'mock',
      note: 'smoke test',
    };
    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(orderBody);
    assert.equal(order.status, 200, `create order failed: ${JSON.stringify(order.body)}`);
    assert.equal(order.body.code, 0, `create order failed: ${JSON.stringify(order.body)}`);
    orderId = order.body.data.id;
  });

  test('admin: dedicated login + list orders + update status pending -> paid', async () => {
    const admin = request.agent(app);
    const adminLogin = await withAdminGatewayHeaders(
      admin.post('/api/admin/auth/login'),
    )
      .send({ phone, countryCode, password })
      .expect(200);
    assert.equal(adminLogin.body.code, 0);

    const list = await withAdminGatewayHeaders(
      admin.get('/api/admin/orders'),
    )
      .query({ pageSize: 20 })
      .expect(200);
    assert.equal(list.body.code, 0);
    const found = list.body.data.list.some((o) => o.id === orderId);
    assert.ok(found, 'admin order list should include smoke order');

    const csrfRes = await withAdminGatewayHeaders(
      admin.get('/api/admin/auth/csrf'),
    ).expect(200);
    const csrfToken = csrfRes.body?.data?.csrfToken || csrfRes.body?.csrfToken || '';
    assert.ok(csrfToken, 'admin csrf token should be present');

    const upd = await withAdminGatewayHeaders(
      admin.put(`/api/admin/orders/${orderId}/status`),
    )
      .set('X-CSRF-Token', csrfToken)
      .send({ status: 'paid' })
      .expect(200);
    assert.equal(upd.body.code, 0);

    const userOrder = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.equal(userOrder.body.data.status, 'paid');
    assert.equal(userOrder.body.data.payment_status, 'paid');
  });

  test('logistics: ship + admin refresh returns timeline on user order detail', async () => {
    const admin = request.agent(app);
    const adminLogin = await withAdminGatewayHeaders(
      admin.post('/api/admin/auth/login'),
    )
      .send({ phone, countryCode, password })
      .expect(200);
    assert.equal(adminLogin.body.code, 0);

    const csrfRes = await withAdminGatewayHeaders(
      admin.get('/api/admin/auth/csrf'),
    ).expect(200);
    const csrfToken = csrfRes.body?.data?.csrfToken || csrfRes.body?.csrfToken || '';
    assert.ok(csrfToken, 'admin csrf token should be present');

    const ship = await withAdminGatewayHeaders(
      admin.put(`/api/admin/orders/${orderId}/ship`),
    )
      .set('X-CSRF-Token', csrfToken)
      .send({ trackingNo: 'MYTRACK-SMOKE-001', carrier: 'J&T Express' })
      .expect(200);
    assert.equal(ship.body.code, 0);

    const refresh = await withAdminGatewayHeaders(
      admin.post(`/api/admin/orders/${orderId}/logistics/refresh`),
    )
      .set('X-CSRF-Token', csrfToken)
      .send({})
      .expect(200);
    assert.equal(refresh.body.code, 0);
    assert.ok(Array.isArray(refresh.body.data.logistics_timeline));
    assert.ok(typeof refresh.body.data.logistics_provider === 'object');

    const userOrder = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.equal(userOrder.body.code, 0);
    assert.ok(Array.isArray(userOrder.body.data.logistics_timeline));
  });

  test('cart: DELETE /api/cart clears cart (static route before /:productId)', async () => {
    await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId, qty: 1 })
      .expect(200);

    const cleared = await request(app)
      .delete('/api/cart')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.equal(cleared.body.code, 0);

    const empty = await request(app)
      .get('/api/cart')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.equal(empty.body.code, 0);
    assert.ok(Array.isArray(empty.body.data));
    assert.equal(empty.body.data.length, 0);
  });

  test('notifications: unread-count route not shadowed by GET /', async () => {
    const r = await request(app)
      .get('/api/notifications/unread-count')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.equal(r.body.code, 0);
    assert.ok(typeof r.body.data?.count === 'number');
  });

  test('shipping quote: server is source of truth', async () => {
    const quote = await request(app)
      .post('/api/shipping/quote')
      .send({
        shipping_template_id: shippingTemplateId,
        raw_amount: 99,
        estimated_weight_kg: 1.2,
      })
      .expect(200);
    assert.equal(quote.body.code, 0);
    assert.equal(quote.body.data.shipping_template_id, shippingTemplateId);
    assert.ok(typeof quote.body.data.shipping_fee === 'number');
  });

  test('search: hot / suggest / track respond successfully', async () => {
    const hot = await request(app).get('/api/search/hot').expect(200);
    assert.equal(hot.body.code, 0);
    assert.ok(Array.isArray(hot.body.data));

    const sug = await request(app).get('/api/search/suggest').query({ keyword: 'a' }).expect(200);
    assert.equal(sug.body.code, 0);
    assert.ok(Array.isArray(sug.body.data));

    const tr = await request(app)
      .post('/api/search/track')
      .send({ keyword: 'flow-smoke', source: 'test' })
      .expect(200);
    assert.equal(tr.body.code, 0);
  });

  after(async () => {
    if (smokeProductId) {
      await db.query('DELETE FROM inventory_stock_records WHERE product_id = ?', [smokeProductId]).catch(() => {});
      await db.query('DELETE FROM product_variant_spec_values WHERE product_id = ?', [smokeProductId]).catch(() => {});
      await db.query('DELETE FROM product_variants WHERE product_id = ?', [smokeProductId]).catch(() => {});
      await db.query('DELETE FROM products WHERE id = ?', [smokeProductId]);
    }
  });
});

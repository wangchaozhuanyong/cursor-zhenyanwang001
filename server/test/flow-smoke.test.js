/**
 * 本地主流程联调：用户注册→商品→购物车→下单；DB 提升为 admin 后走后台订单列表与改状态。
 * 需：MySQL 已初始化 seed、.env 可连库。不依赖 HTTPS / Stripe Webhook。
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { randomUUID } = require('crypto');
const app = require('../src/app');
const db = require('../src/config/db');

/** 避免与其它测试或同毫秒重复注册导致 Duplicate entry phone */
const phone = `1${`${Date.now()}${process.pid}${Math.random().toString(36).slice(2, 9)}`.replace(/\D/g, '').slice(0, 10)}`;
const countryCode = '+60';
const storedPhone = `${countryCode}${phone.replace(/^0+/, '')}`;
const password = 'SmokeTest12';
let accessToken;
let productId;
let smokeProductId;
let orderId;
let shippingTemplateId;

describe('local flow smoke', () => {
  before(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ phone, countryCode, password, nickname: 'smoke' })
      .expect(200);
    assert.equal(reg.body.code, 0);

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
    const productList = products.body.data?.list || [];
    const inStock = productList.find((p) => Number(p?.stock) > 0);
    if (inStock) {
      productId = inStock.id;
    } else {
      smokeProductId = randomUUID();
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
      productId = smokeProductId;
    }

    let shipping = await request(app)
      .get('/api/shipping')
      .expect(200);
    assert.equal(shipping.body.code, 0);
    assert.ok(Array.isArray(shipping.body.data));
    if (!shipping.body.data.length) {
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
    assert.ok(shipping.body.data.length > 0, '运费模板列表不应为空');
    shippingTemplateId = shipping.body.data.some((t) => t.id === shippingTemplateId)
      ? shippingTemplateId
      : shipping.body.data[0].id;

    const detail = await request(app)
      .get(`/api/products/${productId}`)
      .expect(200);
    assert.equal(detail.body.code, 0);

    const cart = await request(app)
      .post('/api/cart')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ productId, qty: 1 })
      .expect(200);
    assert.equal(cart.body.code, 0);

    const [[u]] = await db.query('SELECT id FROM users WHERE phone = ?', [storedPhone]);
    await db.query('UPDATE users SET role = ? WHERE id = ?', ['admin', u.id]);

    const orderBody = {
      items: [{ product_id: productId, qty: 1 }],
      contact_name: '联调',
      contact_phone: phone,
      address: '本地联调地址',
      payment_method: 'mock',
      note: 'smoke test',
    };
    const order = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${accessToken}`)
      .send(orderBody)
      .expect(200);
    assert.equal(order.body.code, 0);
    orderId = order.body.data.id;
  });

  test('admin: dedicated login + list orders + update status pending -> paid', async () => {
    const adminLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({ phone, countryCode, password })
      .expect(200);
    assert.equal(adminLogin.body.code, 0);
    const adminToken =
      typeof adminLogin.body.data.token === 'string'
        ? adminLogin.body.data.token
        : adminLogin.body.data.token.accessToken;

    const list = await request(app)
      .get('/api/admin/orders')
      .set('Authorization', `Bearer ${adminToken}`)
      .query({ pageSize: 20 })
      .expect(200);
    assert.equal(list.body.code, 0);
    const found = list.body.data.list.some((o) => o.id === orderId);
    assert.ok(found, '后台列表应包含刚创建订单');

    const upd = await request(app)
      .put(`/api/admin/orders/${orderId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
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
    const adminLogin = await request(app)
      .post('/api/admin/auth/login')
      .send({ phone, countryCode, password })
      .expect(200);
    assert.equal(adminLogin.body.code, 0);
    const adminToken =
      typeof adminLogin.body.data.token === 'string'
        ? adminLogin.body.data.token
        : adminLogin.body.data.token.accessToken;

    const ship = await request(app)
      .put(`/api/admin/orders/${orderId}/ship`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ trackingNo: 'MYTRACK-SMOKE-001', carrier: 'J&T Express' })
      .expect(200);
    assert.equal(ship.body.code, 0);

    const refresh = await request(app)
      .post(`/api/admin/orders/${orderId}/logistics/refresh`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({})
      .expect(200);
    assert.equal(refresh.body.code, 0);
    assert.ok(Array.isArray(refresh.body.data.logistics_timeline));
    assert.ok(
      refresh.body.data.logistics_timeline.length > 0,
      '刷新后应有物流轨迹节点',
    );
    assert.ok(refresh.body.data.logistics_provider?.tracking_url);

    const userOrder = await request(app)
      .get(`/api/orders/${orderId}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    assert.equal(userOrder.body.code, 0);
    assert.ok(
      Array.isArray(userOrder.body.data.logistics_timeline)
        && userOrder.body.data.logistics_timeline.length > 0,
      '用户订单详情应带上物流时间线',
    );
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
      await db.query('DELETE FROM products WHERE id = ?', [smokeProductId]);
    }
  });
});

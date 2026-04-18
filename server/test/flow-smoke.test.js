/**
 * 本地主流程联调：用户注册→商品→购物车→下单；DB 提升为 admin 后走后台订单列表与改状态。
 * 需：MySQL 已初始化 seed、.env 可连库。不依赖 HTTPS / Stripe Webhook。
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
require('./_dbCleanup.test');
const { test, describe, before } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

/** 避免与其它测试或同毫秒重复注册导致 Duplicate entry phone */
const phone = `1${`${Date.now()}${process.pid}${Math.random().toString(36).slice(2, 9)}`.replace(/\D/g, '').slice(0, 10)}`;
const password = 'SmokeTest12';
let accessToken;
let productId;
let orderId;
let shippingTemplateId;

describe('local flow smoke', () => {
  before(async () => {
    const reg = await request(app)
      .post('/api/auth/register')
      .send({ phone, password, nickname: 'smoke' })
      .expect(200);
    assert.equal(reg.body.code, 0);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ phone, password })
      .expect(200);
    assert.equal(login.body.code, 0);
    accessToken = login.body.data.token.accessToken;

    const products = await request(app)
      .get('/api/products')
      .query({ pageSize: 1 })
      .expect(200);
    assert.equal(products.body.code, 0);
    assert.ok(products.body.data?.list?.length, 'seed 应有至少一个商品');
    productId = products.body.data.list[0].id;

    const shipping = await request(app)
      .get('/api/shipping')
      .expect(200);
    assert.equal(shipping.body.code, 0);
    assert.ok(Array.isArray(shipping.body.data));
    assert.ok(shipping.body.data.length > 0, 'seed 应至少有一个运费模板');
    shippingTemplateId = shipping.body.data[0].id;

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

    const [[u]] = await db.query('SELECT id FROM users WHERE phone = ?', [phone]);
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
      .send({ phone, password })
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
});

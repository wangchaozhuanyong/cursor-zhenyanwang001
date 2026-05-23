/**
 * 一次性业务流程验证：商品列表 → 详情 → 登录 → 下单 → 订单列表 + DB 校验
 * 用法：在 server 目录执行  node scripts/verify-business-flow.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const request = require('supertest');
const app = require('../src/app');
const db = require('../src/config/db');

function printStep(title, reqInfo, resStatus, resBody) {
  console.log('\n' + '='.repeat(60));
  console.log(title);
  console.log('请求:', JSON.stringify(reqInfo, null, 2));
  console.log('HTTP:', resStatus);
  console.log('响应:', typeof resBody === 'string' ? resBody : JSON.stringify(resBody, null, 2));
}

async function main() {
  const countryCode = '+60';
  // 马来西亚本地号：01 + 8 位数字（校验规则为去掉国家码后 /^1\d{8,9}$/）
  const phone = `01${`${Date.now()}`.slice(-8)}`;
  const password = 'VerifyFlow1';
  let token;
  let userId;
  let productId;
  let orderId;

  // 0) 注册 + 登录（订单接口需要 JWT）
  const reg = await request(app).post('/api/auth/register').send({
    countryCode,
    phone,
    password,
    nickname: 'flow-verify',
  });
  printStep(
    '0) POST /api/auth/register',
    { method: 'POST', path: '/api/auth/register', body: { countryCode, phone, password: '***', nickname: 'flow-verify' } },
    reg.status,
    reg.body,
  );
  if (reg.status !== 200 || reg.body.code !== 0) {
    console.error('\n[失败] 定位: auth 链路 — controller → auth.api.service → auth.service 或 DB(users 写入)');
    process.exitCode = 1;
    return;
  }

  const login = await request(app).post('/api/auth/login').send({ countryCode, phone, password });
  printStep(
    '0b) POST /api/auth/login',
    { method: 'POST', path: '/api/auth/login', body: { countryCode, phone, password: '***' } },
    login.status,
    login.body,
  );
  if (login.status !== 200 || login.body.code !== 0) {
    console.error('\n[失败] 定位: auth 登录 — service / DB');
    process.exitCode = 1;
    return;
  }
  userId = login.body.data?.userId || userId;
  token = login.body.data?.token?.accessToken || login.body.data?.token;
  if (typeof token === 'object') token = token.accessToken;

  // 1) 商品列表
  const list = await request(app).get('/api/products').query({ page: 1, pageSize: 5 });
  printStep(
    '1) GET /api/products?page=1&pageSize=5',
    { method: 'GET', path: '/api/products', query: { page: 1, pageSize: 5 } },
    list.status,
    list.body,
  );
  if (list.status !== 200 || list.body.code !== 0) {
    console.error('\n[失败] 定位: product.controller → product.api.service → catalog.service 或 DB(products)');
    process.exitCode = 1;
    return;
  }
  const plist = list.body.data?.list || [];
  if (!plist.length) {
    console.error('\n[失败] 无商品数据 — 定位: DB（products 表为空，需 seed 或后台录入）');
    process.exitCode = 1;
    await db.end().catch(() => {});
    return;
  }
  const pick =
    plist.find((p) => Number(p.stock) > 0 && Number(p.price) > 0 && Number(p.price) <= 50000) || plist[0];
  productId = pick.id;

  // 2) 商品详情
  const detail = await request(app).get(`/api/products/${productId}`);
  printStep(
    `2) GET /api/products/${productId}`,
    { method: 'GET', path: `/api/products/${productId}` },
    detail.status,
    detail.body,
  );
  if (detail.status !== 200 || detail.body.code !== 0) {
    console.error('\n[失败] 定位: product.controller → product.api.service → catalog.service 或 DB');
    process.exitCode = 1;
    return;
  }

  // 3) 创建订单
  const orderBody = {
    items: [{ product_id: productId, qty: 1 }],
    contact_name: '流程验证',
    contact_phone: phone,
    address: '测试地址',
    payment_method: 'mock',
    note: 'verify-business-flow',
  };
  const create = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .send(orderBody);
  printStep(
    '3) POST /api/orders',
    {
      method: 'POST',
      path: '/api/orders',
      headers: { Authorization: 'Bearer ***' },
      body: { ...orderBody, items: orderBody.items },
    },
    create.status,
    create.body,
  );
  if (create.status !== 200 || create.body.code !== 0) {
    console.error('\n[失败] 定位: order.controller → order.api.service → createOrder.orchestrator → order.service 或 DB');
    process.exitCode = 1;
    return;
  }
  orderId = create.body.data?.id;

  // 4) 订单列表
  const orders = await request(app)
    .get('/api/orders')
    .set('Authorization', `Bearer ${token}`)
    .query({ page: 1, pageSize: 10 });
  printStep(
    '4) GET /api/orders?page=1&pageSize=10',
    { method: 'GET', path: '/api/orders', query: { page: 1, pageSize: 10 }, headers: { Authorization: 'Bearer ***' } },
    orders.status,
    orders.body,
  );
  if (orders.status !== 200 || orders.body.code !== 0) {
    console.error('\n[失败] 定位: order.controller → order.api.service → order.service 或 DB');
    process.exitCode = 1;
    return;
  }

  // DB 校验
  console.log('\n' + '='.repeat(60));
  console.log('数据库校验');
  const [[u]] = await db.query('SELECT id, phone FROM users WHERE id = ? LIMIT 1', [userId]);
  const [[o]] = await db.query(
    'SELECT id, order_no, user_id, total_amount, status FROM orders WHERE id = ? LIMIT 1',
    [orderId],
  );
  const [items] = await db.query(
    'SELECT product_id, qty FROM order_items WHERE order_id = ?',
    [orderId],
  );
  console.log('users 行:', u || '(未找到)');
  console.log('orders 行:', o || '(未找到)');
  console.log('order_items:', items);

  if (!u || !o || !items?.length) {
    console.error('\n[失败] DB 写入不完整 — 定位: order.repository / 事务提交 / 连接配置');
    process.exitCode = 1;
  } else {
    console.log('\n[通过] 完整业务流程与数据库写入校验成功');
  }

  await db.end().catch(() => {});
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});

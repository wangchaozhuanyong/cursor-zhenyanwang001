#!/usr/bin/env node
/* eslint-disable no-console */

const BASE = process.env.BASE_URL || 'http://13.212.179.213';
const API = `${BASE}/api`;
const ADMIN_PHONE = process.env.ADMIN_PHONE || '18800000001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function randomPhone() {
  return `1${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 900 + 100)}`.slice(0, 11);
}

async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.code !== 0) {
    throw new Error(`${options.method || 'GET'} ${url} -> ${json.message || res.status}`);
  }
  return json.data;
}

async function loginAdmin() {
  const data = await jfetch(`${API}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  return typeof data.token === 'string' ? data.token : data.token?.accessToken;
}

async function registerAndLoginUser() {
  const phone = randomPhone();
  const password = 'Scenario123A';
  const nickname = `场景用户${phone.slice(-4)}`;
  await jfetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, nickname }),
  });
  const login = await jfetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  return {
    phone,
    password,
    nickname,
    token: login.token?.accessToken || login.token,
  };
}

async function createAddresses(userToken) {
  const ids = [];
  for (let i = 1; i <= 3; i += 1) {
    const data = await jfetch(`${API}/addresses`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: `测试收件人${i}`,
        phone: `13${Math.floor(Math.random() * 1000000000).toString().padStart(9, '0')}`,
        address: `吉隆坡测试地址 ${i} 号`,
        isDefault: i === 1,
      }),
    });
    ids.push(data.id);
  }
  // 切换一次默认地址，验证 default 接口
  await jfetch(`${API}/addresses/${ids[2]}/default`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  return ids;
}

async function claimCoupons(userToken) {
  const list = await jfetch(`${API}/coupons/available`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  const claimed = [];
  for (const c of list.slice(0, 3)) {
    await jfetch(`${API}/coupons/claim`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code: c.id }),
    });
    claimed.push(c.id);
  }
  return claimed;
}

async function createOrders(userToken, count = 5) {
  const products = await jfetch(`${API}/products?page=1&pageSize=50`);
  const list = products.list || [];
  if (!list.length) throw new Error('没有可下单商品');
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    const p = list[i % list.length];
    await jfetch(`${API}/cart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId: p.id, qty: 1 }),
    });
    const order = await jfetch(`${API}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ product_id: p.id, qty: 1 }],
        contact_name: '场景用户',
        contact_phone: '13900000000',
        address: `场景订单地址-${i + 1}`,
        payment_method: 'mock',
        note: `场景订单 ${i + 1}`,
      }),
    });
    ids.push({ orderId: order.id, productId: p.id });
  }
  return ids;
}

async function getUserIdByPhone(adminToken, phone) {
  const users = await jfetch(`${API}/admin/users?page=1&pageSize=50&keyword=${phone}`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const hit = (users.list || []).find((u) => u.phone === phone);
  if (!hit) throw new Error(`找不到用户 ${phone}`);
  return hit.id;
}

async function advanceOrderStatuses(adminToken, orders) {
  for (let i = 0; i < orders.length; i += 1) {
    const o = orders[i];
    // 先改 paid
    await jfetch(`${API}/admin/orders/${o.orderId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'paid' }),
    });
    // 再改 shipped，留一部分用于退货
    await jfetch(`${API}/admin/orders/${o.orderId}/status`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status: 'shipped' }),
    });
    // 前3笔改 completed，用于评价
    if (i < 3) {
      await jfetch(`${API}/admin/orders/${o.orderId}/status`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'completed' }),
      });
    }
  }
}

async function createReviews(userToken, orders) {
  const done = [];
  for (const x of orders.slice(0, 3)) {
    const r = await jfetch(`${API}/reviews`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: x.productId,
        rating: 5,
        content: `真实流程自动评价：商品 ${x.productId} 体验良好，物流及时，包装完整。`,
        images: [],
      }),
    });
    done.push(r.id);
  }
  return done;
}

async function createReturns(userToken, orders) {
  const done = [];
  // 用 shipped/completed 状态的订单发起售后
  for (const x of orders.slice(0, 2)) {
    const ret = await jfetch(`${API}/returns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${userToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        order_id: x.orderId,
        type: 'refund',
        reason: '自动化联调售后申请',
        description: `场景测试退货申请，订单 ${x.orderId}`,
        images: [],
      }),
    });
    done.push(ret.id);
  }
  return done;
}

async function createPointsRecords(adminToken, userToken, userId) {
  await jfetch(`${API}/points/sign-in`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${userToken}` },
  });
  try {
    await jfetch(`${API}/admin/users/${userId}/points`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        points: 120,
        reason: '自动化联调加积分',
      }),
    });
  } catch (e) {
    // 环境可能存在历史库结构差异，保留签到积分链路即可继续验证
    console.log(`admin points adjust skipped: ${e.message}`);
  }
  const records = await jfetch(`${API}/points/records?page=1&pageSize=20`, {
    headers: { Authorization: `Bearer ${userToken}` },
  });
  return records.total || (records.list || []).length;
}

async function main() {
  console.log(`BASE=${BASE}`);
  const adminToken = await loginAdmin();
  await sleep(600);

  const user = await registerAndLoginUser();
  await sleep(600);

  const addressIds = await createAddresses(user.token);
  const couponIds = await claimCoupons(user.token);
  const orders = await createOrders(user.token, 5);

  const userId = await getUserIdByPhone(adminToken, user.phone);
  await advanceOrderStatuses(adminToken, orders);

  const reviewIds = await createReviews(user.token, orders);
  const returnIds = await createReturns(user.token, orders);
  const pointsRecordCount = await createPointsRecords(adminToken, user.token, userId);

  const summary = {
    base: BASE,
    admin: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
    scenarioUser: {
      phone: user.phone,
      password: user.password,
      nickname: user.nickname,
      userId,
    },
    created: {
      addresses: addressIds,
      claimedCoupons: couponIds,
      orders: orders.map((x) => x.orderId),
      reviews: reviewIds,
      returns: returnIds,
      pointsRecordsVisible: pointsRecordCount,
    },
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});


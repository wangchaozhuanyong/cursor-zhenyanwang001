#!/usr/bin/env node
/* eslint-disable no-console */

const BASE = process.env.BASE_URL || 'http://13.212.179.213';
const API = `${BASE}/api`;

function phone() {
  return `1${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 900 + 100)}`.slice(0, 11);
}

function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 0) {
    throw new Error(`${options.method || 'GET'} ${url} -> ${body.message || res.status}`);
  }
  return body.data;
}

async function registerAndLogin(nicknamePrefix) {
  const p = phone();
  const pwd = 'FrontFlow123A';
  await jfetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: p, password: pwd, nickname: `${nicknamePrefix}-${p.slice(-4)}` }),
  });
  await wait(300);
  const login = await jfetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: p, password: pwd }),
  });
  return {
    phone: p,
    password: pwd,
    token: login.token?.accessToken || login.token,
  };
}

async function authGet(path, token) {
  return jfetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function authPost(path, token, payload) {
  return jfetch(`${API}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function authPut(path, token, payload) {
  return jfetch(`${API}${path}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
}

async function main() {
  console.log(`BASE=${BASE}`);
  console.log('1) 注册邀请人账号...');
  const inviter = await registerAndLogin('邀请人');
  await wait(400);
  const inviterProfile = await authGet('/auth/profile', inviter.token);
  const inviteCode = inviterProfile.inviteCode || inviterProfile.invite_code;
  if (!inviteCode) throw new Error('邀请人邀请码为空');

  console.log('2) 注册被邀请人账号...');
  const invitee = await registerAndLogin('被邀请人');
  await wait(500);

  console.log('3) 被邀请人前端流程：地址/领券/加购/下单...');
  await authPost('/addresses', invitee.token, {
    name: '测试收件人A',
    phone: '13911112222',
    address: '吉隆坡前端流程地址A',
    isDefault: true,
  });
  const available = await authGet('/coupons/available', invitee.token);
  if ((available || []).length) {
    await authPost('/coupons/claim', invitee.token, { code: available[0].id });
  }
  const products = await jfetch(`${API}/products?page=1&pageSize=20`);
  const p = products.list?.[0];
  if (!p) throw new Error('没有可下单商品');
  await authPost('/cart', invitee.token, { productId: p.id, qty: 1 });
  const order = await authPost('/orders', invitee.token, {
    items: [{ product_id: p.id, qty: 1 }],
    contact_name: '被邀请人测试',
    contact_phone: invitee.phone,
    address: '吉隆坡前端流程地址A',
    payment_method: 'mock',
    note: '前端流程模拟下单',
  });

  console.log('4) 管理员把订单推进到可评价状态...');
  const adminLogin = await jfetch(`${API}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '18800000001', password: 'Admin123456' }),
  });
  const adminToken = typeof adminLogin.token === 'string' ? adminLogin.token : adminLogin.token?.accessToken;
  await authPut(`/admin/orders/${order.id}/status`, adminToken, { status: 'paid' });
  await authPut(`/admin/orders/${order.id}/status`, adminToken, { status: 'shipped' });
  await authPut(`/admin/orders/${order.id}/status`, adminToken, { status: 'completed' });

  console.log('5) 被邀请人评价、申请售后、签到积分...');
  await authPost('/reviews', invitee.token, {
    product_id: p.id,
    rating: 5,
    content: '前端流程真实模拟评价：商品质量好，功能正常。',
    images: [],
  });
  await authPost('/returns', invitee.token, {
    order_id: order.id,
    type: 'refund',
    reason: '前端流程联调退货申请',
    description: '用于验证售后流程链路',
    images: [],
  });
  try {
    await authPost('/points/sign-in', invitee.token, {});
  } catch (_e) {
    // 今日已签到不算失败
  }

  console.log('6) 校验邀请链路数据...');
  const inviterStats = await authGet('/invite/stats', inviter.token);
  const inviterRecords = await authGet('/invite/records?page=1&pageSize=20', inviter.token);

  const summary = {
    inviter: {
      phone: inviter.phone,
      password: inviter.password,
      inviteCode,
      stats: inviterStats,
    },
    invitee: {
      phone: invitee.phone,
      password: invitee.password,
      orderId: order.id,
      productId: p.id,
    },
    inviteRecordsCount: inviterRecords.total || inviterRecords.list?.length || 0,
  };

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((e) => {
  console.error(`FLOW_FAILED: ${e.message}`);
  process.exit(1);
});


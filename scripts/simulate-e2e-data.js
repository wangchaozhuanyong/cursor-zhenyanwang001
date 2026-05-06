#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');

const BASE = process.env.BASE_URL || 'http://13.212.179.213';
const API = `${BASE}/api`;
const ADMIN_PHONE = process.env.ADMIN_PHONE || '18800000001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';
const PRODUCT_COUNT = Number(process.env.PRODUCT_COUNT || 50);
const USER_COUNT = Number(process.env.USER_COUNT || 10);

function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomPhone() {
  return `1${Date.now().toString().slice(-7)}${randInt(100, 999)}`.slice(0, 11);
}

async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  let body = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok || !body || body.code !== 0) {
    const msg = body?.message || `HTTP ${res.status}`;
    throw new Error(`${options.method || 'GET'} ${url} failed: ${msg}`);
  }
  return body.data;
}

async function adminLogin() {
  const data = await jfetch(`${API}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  const token = typeof data.token === 'string' ? data.token : data.token?.accessToken;
  if (!token) throw new Error('Admin token missing');
  return token;
}

async function userLogin(phone, password) {
  const data = await jfetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password }),
  });
  return data.token?.accessToken || data.token;
}

async function userRegister(phone, password, nickname) {
  await jfetch(`${API}/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, password, nickname }),
  });
}

function makePngBuffer(seed) {
  const rgb = crypto.createHash('md5').update(seed).digest();
  // 1x1 png with dynamic RGB
  const hex = [
    '89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de',
    '0000000c4944415408d763',
    rgb.subarray(0, 3).toString('hex'),
    '000000ffff03000100',
    '9d4d17c30000000049454e44ae426082',
  ].join('');
  return Buffer.from(hex, 'hex');
}

async function uploadImageSet(userToken, count = 12) {
  const urls = [];
  for (let i = 0; i < count; i += 1) {
    const name = `sim_${i + 1}.png`;
    const png = makePngBuffer(`${Date.now()}-${i}`);
    const blob = new Blob([png], { type: 'image/png' });
    const form = new FormData();
    form.append('file', blob, name);
    const data = await jfetch(`${API}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${userToken}` },
      body: form,
    });
    urls.push(`${BASE}${data.url}`);
  }
  return urls;
}

async function ensureCategories(adminToken) {
  const categories = [
    { id: 'sim-cat-digital', name: '数码设备' },
    { id: 'sim-cat-home', name: '家居用品' },
    { id: 'sim-cat-fashion', name: '时尚配件' },
    { id: 'sim-cat-outdoor', name: '户外运动' },
    { id: 'sim-cat-food', name: '进口食品' },
  ];
  for (const c of categories) {
    try {
      await jfetch(`${API}/admin/categories`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: c.id,
          name: c.name,
          icon: '',
          sort_order: randInt(1, 50),
        }),
      });
    } catch (err) {
      // Duplicate category is acceptable for idempotent reruns
      if (!String(err.message).includes('Duplicate') && !String(err.message).includes('已存在')) {
        throw err;
      }
    }
  }
  return categories.map((x) => x.id);
}

async function createProducts(adminToken, imagePool, categoryIds) {
  const created = [];
  for (let i = 1; i <= PRODUCT_COUNT; i += 1) {
    const price = randInt(39, 899);
    const original = price + randInt(20, 320);
    const stock = randInt(30, 400);
    const cover = imagePool[i % imagePool.length];
    const images = [cover, imagePool[(i + 1) % imagePool.length], imagePool[(i + 2) % imagePool.length]];
    const categoryId = categoryIds[i % categoryIds.length];
    const payload = {
      name: `模拟商品-${String(i).padStart(2, '0')}-${Date.now().toString().slice(-5)}`,
      cover_image: cover,
      images,
      price,
      original_price: original,
      sales_count: randInt(0, 500),
      points: randInt(1, 90),
      category_id: categoryId,
      stock,
      status: 'active',
      sort_order: PRODUCT_COUNT - i,
      description: `这是用于功能联调的模拟商品第 ${i} 条，包含图集、价格、库存、分类、标签状态等完整字段。`,
      is_recommended: i % 2 === 0,
      is_new: i % 3 === 0,
      is_hot: i % 5 === 0,
    };
    const data = await jfetch(`${API}/admin/products`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    created.push(data);
  }
  return created;
}

async function createCampaignData(adminToken, imagePool) {
  const couponIds = [];
  for (let i = 1; i <= 8; i += 1) {
    const code = `SIMSALE${String(i).padStart(2, '0')}${Date.now().toString().slice(-3)}`;
    const data = await jfetch(`${API}/admin/coupons`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        title: `模拟活动券 ${i}`,
        type: i % 2 === 0 ? 'percent' : 'fixed',
        value: i % 2 === 0 ? randInt(5, 20) : randInt(8, 60),
        min_amount: randInt(99, 399),
        start_date: '2026-04-25',
        end_date: '2026-12-31',
        description: `自动化联调生成活动券 ${i}`,
      }),
    });
    couponIds.push(data.id);
  }

  for (let i = 0; i < 6; i += 1) {
    await jfetch(`${API}/admin/banners`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${adminToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: `模拟Banner-${i + 1}`,
        image: imagePool[i % imagePool.length],
        link: '/products',
        sort_order: i + 1,
        enabled: true,
        publish_status: 'published',
      }),
    });
  }

  await jfetch(`${API}/admin/notifications`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      type: 'system',
      title: '模拟促销活动上线',
      content: '系统已自动生成模拟活动与商品数据，用于联调验证。',
    }),
  });

  await jfetch(`${API}/admin/settings`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      site_name: 'FlashCast 模拟联调站点',
      announcement: '当前为自动化联调数据环境',
      support_email: 'support@flashcast.com.my',
    }),
  });

  return { couponCount: couponIds.length, bannerCount: 6 };
}

async function simulateOrders(products) {
  const results = [];
  let sourceProducts = products;
  if (!sourceProducts || sourceProducts.length === 0) {
    const list = await jfetch(`${API}/products?page=1&pageSize=50`);
    sourceProducts = list.list || [];
  }
  if (!sourceProducts.length) {
    throw new Error('无可下单商品，无法模拟订单流程');
  }
  const phone = randomPhone();
  const password = `SimUser${randInt(1000, 9999)}A`;
  await userRegister(phone, password, '模拟下单用户');
  const token = await userLogin(phone, password);
  for (let i = 1; i <= USER_COUNT; i += 1) {
    const p = sourceProducts[i % sourceProducts.length];
    await jfetch(`${API}/cart`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ productId: p.id, qty: randInt(1, 3) }),
    });
    const order = await jfetch(`${API}/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [{ product_id: p.id, qty: 1 }],
        contact_name: `模拟用户${i}`,
        contact_phone: phone,
        address: `马来西亚测试地址 ${i} 号`,
        payment_method: 'mock',
        note: '自动化联调订单',
      }),
    });
    results.push(order.id);
  }
  return results;
}

async function main() {
  console.log(`Base URL: ${BASE}`);
  console.log('1) 管理员登录...');
  const adminToken = await adminLogin();

  console.log('2) 普通用户登录并上传图片...');
  // admin 账号也在 users 表，可直接用于普通 auth token（真实接口链路）
  const userToken = await userLogin(ADMIN_PHONE, ADMIN_PASSWORD);
  const imagePool = await uploadImageSet(userToken, 15);
  console.log(`   上传图片 ${imagePool.length} 张`);

  console.log('3) 创建分类...');
  const categoryIds = await ensureCategories(adminToken);

  console.log(`4) 创建 ${PRODUCT_COUNT} 个商品...`);
  const products = await createProducts(adminToken, imagePool, categoryIds);

  console.log('5) 创建活动数据（优惠券/轮播/通知/站点设置）...');
  const campaign = await createCampaignData(adminToken, imagePool);

  console.log(`6) 模拟 ${USER_COUNT} 个用户下单流程...`);
  const orderIds = await simulateOrders(products);

  console.log('==== 完成 ====');
  console.log(`商品: ${products.length}`);
  console.log(`优惠券: ${campaign.couponCount}`);
  console.log(`轮播: ${campaign.bannerCount}`);
  console.log(`订单: ${orderIds.length}`);
  console.log('示例商品ID:', products.slice(0, 3).map((x) => x.id).join(', '));
  console.log('示例订单ID:', orderIds.slice(0, 3).join(', '));
}

main().catch((err) => {
  console.error('模拟失败:', err.message);
  process.exit(1);
});


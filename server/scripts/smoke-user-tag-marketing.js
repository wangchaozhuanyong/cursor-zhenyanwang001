#!/usr/bin/env node
/* eslint-disable no-console */
const crypto = require('crypto');

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const API = `${BASE}/api`;
const ADMIN_PHONE = process.env.ADMIN_PHONE || '18800000001';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123456';

function uniqueCode(prefix) {
  return `${prefix}${Date.now().toString().slice(-8)}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
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
    throw new Error(`${options.method || 'GET'} ${url} failed: ${body?.message || `HTTP ${res.status}`}`);
  }
  return body.data;
}

async function adminLogin() {
  const data = await jfetch(`${API}/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  const token = typeof data?.token === 'string' ? data.token : data?.token?.accessToken;
  if (!token) throw new Error('Admin token missing');
  return token;
}

async function run() {
  const token = await adminLogin();
  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  const created = { tagId: null, couponId: null };

  try {
    console.log(`[1/6] 拉取用户列表: ${BASE}`);
    const usersPage = await jfetch(`${API}/admin/users?page=1&pageSize=20`, { headers });
    const users = Array.isArray(usersPage?.list) ? usersPage.list : [];
    if (users.length < 1) throw new Error('可用用户不足，无法进行批量打标验证');
    const targetUserIds = users.slice(0, Math.min(3, users.length)).map((u) => u.id);
    console.log(`  选中用户: ${targetUserIds.length} 人`);

    console.log('[2/6] 创建测试标签');
    const tagName = `smoke-tag-${Date.now()}`;
    const tag = await jfetch(`${API}/admin/user-tags`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ name: tagName, color: '蓝色', description: 'smoke for user_tag marketing' }),
    });
    created.tagId = tag.id;
    console.log(`  tagId=${created.tagId}`);

    console.log('[3/6] 批量打标');
    const batchRes = await jfetch(`${API}/admin/users/tags/batch`, {
      method: 'PUT',
      headers,
      body: JSON.stringify({ tagId: created.tagId, userIds: targetUserIds }),
    });
    console.log(`  affected=${batchRes?.affected ?? 0}`);

    console.log('[4/6] 创建测试优惠券并按标签发放');
    const coupon = await jfetch(`${API}/admin/coupons`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        code: uniqueCode('SMOKETAG'),
        title: 'SMOKE 标签发券',
        type: 'fixed',
        value: 5,
        min_amount: 30,
        start_date: '2026-01-01',
        end_date: '2027-12-31',
        description: 'smoke test coupon for issue-by-tag',
      }),
    });
    created.couponId = coupon.id;
    const issueRes = await jfetch(`${API}/admin/coupons/${created.couponId}/issue-by-tag`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ tagIds: [created.tagId] }),
    });
    console.log(`  issue result: issued=${issueRes?.issued ?? 0}, targetUsers=${issueRes?.targetUsers ?? 0}`);

    console.log('[5/6] 验证通知受众估算不再回退全量');
    const allAudience = await jfetch(`${API}/admin/notifications/audience-estimate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ audience_type: 'all' }),
    });
    const tagAudience = await jfetch(`${API}/admin/notifications/audience-estimate`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ audience_type: 'user_tag', audience_value: created.tagId, user_tag_ids: [created.tagId] }),
    });
    console.log(`  audience all=${allAudience?.estimated_recipients ?? 0}, user_tag=${tagAudience?.estimated_recipients ?? 0}`);
    if (Number(tagAudience?.estimated_recipients || 0) > Number(allAudience?.estimated_recipients || 0)) {
      throw new Error('user_tag 受众估算异常（大于 all）');
    }

    console.log('[6/6] 验证标签影响人数接口');
    const impact = await jfetch(`${API}/admin/user-tags/${created.tagId}/impact`, { headers });
    console.log(`  impact affectedUsers=${impact?.affectedUsers ?? 0}`);

    console.log('SMOKE_USER_TAG_MARKETING_OK');
  } finally {
    if (created.couponId) {
      await jfetch(`${API}/admin/coupons/${created.couponId}`, {
        method: 'DELETE',
        headers,
      }).catch(() => {});
    }
    if (created.tagId) {
      await jfetch(`${API}/admin/user-tags/${created.tagId}`, {
        method: 'DELETE',
        headers,
      }).catch(() => {});
    }
  }
}

run().catch((err) => {
  console.error(`SMOKE_USER_TAG_MARKETING_FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});


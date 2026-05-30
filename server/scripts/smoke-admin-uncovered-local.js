/**
 * Local-only admin smoke test for admin modules that are not covered by the
 * simulated-content seed script.
 *
 * Safety guard:
 * - Refuses non-local API hosts unless ALLOW_ADMIN_SMOKE_REMOTE=1.
 * - Refuses NODE_ENV=production.
 * - Uses temporary records with a unique SMOKE_LOCAL prefix and deletes them
 *   where the feature supports safe deletion.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const crypto = require('crypto');

const API_BASE = String(process.env.ADMIN_SMOKE_API_BASE || 'http://127.0.0.1:3000/api').replace(/\/+$/, '');
const ADMIN_PHONE = String(process.env.ADMIN_PHONE || '18800000001').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const ALLOW_REMOTE = process.env.ALLOW_ADMIN_SMOKE_REMOTE === '1';
const ALLOW_LOCAL_MFA_RESET = process.env.ALLOW_LOCAL_MFA_RESET === '1';
const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const RUN_ID = `SMOKE_LOCAL_${Date.now().toString(36).toUpperCase()}`;

class HttpError extends Error {
  constructor(message, options = {}) {
    super(message);
    this.name = 'HttpError';
    this.status = options.status;
    this.body = options.body;
    this.method = options.method;
    this.path = options.path;
  }
}

const state = {
  token: '',
  csrfToken: '',
  mfaSecret: '',
  sensitiveActionTokens: {},
  activeSensitiveActionToken: '',
  cleanup: [],
  results: {
    ok: [],
    incomplete: [],
    skipped: [],
    failed: [],
  },
};

function assertLocalUrl(rawUrl, label) {
  const url = new URL(rawUrl);
  if (!ALLOW_REMOTE && !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`${label} is not local: ${rawUrl}. Set ALLOW_ADMIN_SMOKE_REMOTE=1 only if you really want remote smoke testing.`);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NODE_ENV=production, refusing to run local admin smoke writes.');
  }
}

function requireAdminPassword() {
  if (!ADMIN_PASSWORD) {
    throw new Error('Missing ADMIN_PASSWORD env. The script will not hardcode an admin password.');
  }
}

function base32ToBuffer(input) {
  const clean = String(input || '').replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx >= 0) bits += idx.toString(2).padStart(5, '0');
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secretBase32, counter, digits = 6) {
  const key = base32ToBuffer(secretBase32);
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x100000000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = crypto.createHmac('sha1', key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(binary % (10 ** digits)).padStart(digits, '0');
}

function totp(secret) {
  return hotp(secret, Math.floor(Date.now() / 1000 / 30));
}

function tokenFrom(data) {
  if (typeof data?.token === 'string') return data.token;
  if (data?.token?.accessToken) return data.token.accessToken;
  if (data?.accessToken) return data.accessToken;
  return '';
}

function getMessageFromBody(body) {
  if (!body) return '';
  return String(body.message || body.error || body.msg || '').trim();
}

async function readJsonResponse(res, requestInfo) {
  const text = await res.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      if (res.ok) return text;
      throw new HttpError(`${requestInfo.method} ${requestInfo.path} returned non-JSON HTTP ${res.status}: ${text.slice(0, 200)}`, {
        status: res.status,
        method: requestInfo.method,
        path: requestInfo.path,
      });
    }
  }
  if (!res.ok || body.code !== 0) {
    throw new HttpError(`${requestInfo.method} ${requestInfo.path} failed: HTTP ${res.status}, code ${body.code ?? 'unknown'}, ${getMessageFromBody(body) || 'no message'}`, {
      status: res.status,
      body,
      method: requestInfo.method,
      path: requestInfo.path,
    });
  }
  return body.data;
}

async function api(method, apiPath, body = undefined) {
  const upper = String(method).toUpperCase();
  const headers = {
    Authorization: `Bearer ${state.token}`,
    'User-Agent': 'CodexLocalAdminSmoke/1.0',
  };
  const cookies = [];
  if (state.csrfToken) cookies.push(`admin_csrf_token=${encodeURIComponent(state.csrfToken)}`);
  if (state.activeSensitiveActionToken) {
    cookies.push(`admin_sensitive_action_token=${encodeURIComponent(state.activeSensitiveActionToken)}`);
  }
  if (cookies.length) headers.Cookie = cookies.join('; ');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(upper)) {
    headers.Origin = new URL(API_BASE).origin;
    if (state.csrfToken) headers['X-CSRF-Token'] = state.csrfToken;
  }
  const options = { method: upper, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${apiPath}`, options);
  return readJsonResponse(res, { method: upper, path: apiPath });
}

async function localResetAdminMfa() {
  if (!ALLOW_LOCAL_MFA_RESET) return false;
  assertLocalUrl(API_BASE, 'ADMIN_SMOKE_API_BASE');
  const mysql = require('mysql2/promise');
  const { buildPhoneLookupCandidates } = require('../src/utils/phone');
  const candidates = buildPhoneLookupCandidates(ADMIN_PHONE, '86');
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });
  try {
    const marks = candidates.map(() => '?').join(',');
    const [[user]] = await conn.query(
      `SELECT id FROM users WHERE phone IN (${marks}) AND role IN ('admin', 'super_admin') LIMIT 1`,
      candidates,
    );
    if (!user) throw new Error('No matching local admin user found for MFA reset.');
    await conn.query('DELETE FROM admin_trusted_devices WHERE user_id = ?', [user.id]);
    await conn.query('DELETE FROM admin_mfa_settings WHERE user_id = ?', [user.id]);
    return true;
  } finally {
    await conn.end();
  }
}

async function loginAdmin({ allowResetRetry = true } = {}) {
  const res = await fetch(`${API_BASE}/admin/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'CodexLocalAdminSmoke/1.0',
    },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok || body.code !== 0) {
    throw new Error(`Admin login failed: HTTP ${res.status}, ${getMessageFromBody(body) || 'no message'}`);
  }
  const data = body.data || {};
  const directToken = tokenFrom(data);
  if (directToken) {
    state.token = directToken;
    state.csrfToken = data.csrfToken || state.csrfToken;
    return { mode: 'password' };
  }
  if (data.mfaSetupRequired && data.mfaTicket && data.secret) {
    state.mfaSecret = data.secret;
    const verifyRes = await fetch(`${API_BASE}/admin/auth/mfa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CodexLocalAdminSmoke/1.0',
      },
      body: JSON.stringify({
        mfaTicket: data.mfaTicket,
        code: totp(data.secret),
        trustDevice: true,
        trustDays: 30,
      }),
    });
    const verifyBody = await verifyRes.json();
    if (!verifyRes.ok || verifyBody.code !== 0) {
      throw new Error(`Admin MFA setup failed: HTTP ${verifyRes.status}, ${getMessageFromBody(verifyBody) || 'no message'}`);
    }
    state.token = tokenFrom(verifyBody.data || {});
    state.csrfToken = verifyBody.data?.csrfToken || state.csrfToken;
    if (!state.token) throw new Error('MFA setup succeeded but no access token was returned.');
    return { mode: 'mfa_setup' };
  }
  if (data.mfaRequired && data.mfaTicket && process.env.ADMIN_MFA_CODE) {
    const verifyRes = await fetch(`${API_BASE}/admin/auth/mfa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CodexLocalAdminSmoke/1.0',
      },
      body: JSON.stringify({
        mfaTicket: data.mfaTicket,
        code: String(process.env.ADMIN_MFA_CODE),
        trustDevice: true,
        trustDays: 30,
      }),
    });
    const verifyBody = await verifyRes.json();
    if (!verifyRes.ok || verifyBody.code !== 0) {
      throw new Error(`Admin MFA verify failed: HTTP ${verifyRes.status}, ${getMessageFromBody(verifyBody) || 'no message'}`);
    }
    state.token = tokenFrom(verifyBody.data || {});
    state.csrfToken = verifyBody.data?.csrfToken || state.csrfToken;
    if (!state.token) throw new Error('MFA verify succeeded but no access token was returned.');
    return { mode: 'mfa_code' };
  }
  if (data.mfaRequired && allowResetRetry && await localResetAdminMfa()) {
    return loginAdmin({ allowResetRetry: false });
  }
  throw new Error('Admin login requires MFA. Set ADMIN_MFA_CODE, or set ALLOW_LOCAL_MFA_RESET=1 for local only.');
}

async function ensureSensitiveAction(actionClass) {
  if (state.sensitiveActionTokens[actionClass]) {
    state.activeSensitiveActionToken = state.sensitiveActionTokens[actionClass];
    return state.activeSensitiveActionToken;
  }
  const code = state.mfaSecret ? totp(state.mfaSecret) : String(process.env.ADMIN_MFA_CODE || '').trim();
  if (!code) throw new Error(`Step-up MFA is required for ${actionClass}, but no code is available.`);
  const data = await api('POST', '/admin/auth/mfa/reverify', { code, actionClass });
  const token = data?.sensitiveActionToken || '';
  if (!token) throw new Error(`Step-up MFA succeeded but no sensitive action token was returned for ${actionClass}.`);
  state.sensitiveActionTokens[actionClass] = token;
  state.activeSensitiveActionToken = token;
  if (data.csrfToken) state.csrfToken = data.csrfToken;
  return token;
}

function classifyError(err) {
  const msg = `${err?.message || ''} ${getMessageFromBody(err?.body)}`.toLowerCase();
  if (err?.status === 501 || msg.includes('not implemented') || msg.includes('暂未启用') || msg.includes('能力暂未')) {
    return 'incomplete';
  }
  if (
    msg.includes('未启用')
    || msg.includes('功能已关闭')
    || msg.includes('功能关闭')
    || msg.includes('not enabled')
    || msg.includes('not configured')
    || msg.includes('未配置')
    || msg.includes('本站未启用')
    || msg.includes('no matching')
  ) {
    return 'skipped';
  }
  return 'failed';
}

async function run(name, fn, options = {}) {
  const { allowSkip = true } = options;
  try {
    const data = await fn();
    state.results.ok.push(name);
    console.log(`OK ${name}`);
    return data;
  } catch (err) {
    const bucket = allowSkip ? classifyError(err) : 'failed';
    state.results[bucket].push({
      name,
      status: err?.status || null,
      message: err?.message || String(err),
    });
    const label = bucket === 'failed' ? 'FAIL' : bucket === 'incomplete' ? 'INCOMPLETE' : 'SKIP';
    console.warn(`${label} ${name}: ${err?.message || err}`);
    return null;
  }
}

function flattenCategories(list) {
  const out = [];
  const walk = (items) => {
    for (const item of items || []) {
      out.push(item);
      walk(item.children || []);
    }
  };
  walk(Array.isArray(list) ? list : []);
  return out;
}

function listFrom(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  if (Array.isArray(data?.data)) return data.data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

function today(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function futureDateTime(offsetDays = 1) {
  return `${today(offsetDays)} 10:00:00`;
}

async function cleanupAll() {
  const jobs = [...state.cleanup].reverse();
  for (const job of jobs) {
    if (job.actionClass) await ensureSensitiveAction(job.actionClass);
    await run(`清理临时数据：${job.name}`, job.fn, { allowSkip: true });
  }
}

async function testReadOnlyEndpoints() {
  const normalEndpoints = [
    ['后台个人资料', '/admin/account/profile'],
    ['订单声音设置', '/admin/account/order-voice'],
    ['当前 RBAC 权限', '/admin/rbac/me'],
    ['RBAC 权限列表', '/admin/rbac/permissions'],
    ['RBAC 管理员列表', '/admin/rbac/admin-users'],
    ['仪表盘统计', '/admin/dashboard/stats'],
    ['事件中心列表', '/admin/event-center/events?page=1&pageSize=5'],
    ['事件中心汇总', '/admin/event-center/summary'],
    ['事件中心老板指标', '/admin/event-center/boss-metrics'],
    ['事件规则列表', '/admin/event-center/rules'],
    ['用户安全概览', '/admin/user-security/overview'],
    ['用户登录尝试', '/admin/user-security/login-attempts?page=1&pageSize=5'],
    ['用户安全事件', '/admin/user-security/events?page=1&pageSize=5'],
    ['风险 IP 列表', '/admin/user-security/risk-ips?page=1&pageSize=5'],
    ['风险设备列表', '/admin/user-security/risk-devices?page=1&pageSize=5'],
    ['备份概览', '/admin/backups/overview'],
    ['备份健康', '/admin/backups/health'],
    ['备份文件列表', '/admin/backups/files'],
    ['备份告警', '/admin/backups/alerts'],
    ['恢复任务列表', '/admin/restore/jobs'],
    ['恢复演练记录', '/admin/restore/drills'],
    ['订单列表', '/admin/orders?page=1&pageSize=5'],
    ['待发货订单', '/admin/orders/pending-shipments?page=1&pageSize=5'],
    ['订单事件', '/admin/order-events/recent?page=1&pageSize=5'],
    ['弃单列表', '/admin/checkout-abandonments?page=1&pageSize=5'],
    ['到期待提醒弃单', '/admin/checkout-abandonments/reminders/due?page=1&pageSize=5'],
    ['售后列表', '/admin/returns?page=1&pageSize=5'],
    ['支付渠道', '/admin/payments/channels'],
    ['支付订单', '/admin/payments/orders?page=1&pageSize=5'],
    ['支付事件', '/admin/payments/events?page=1&pageSize=5'],
    ['支付对账', '/admin/payments/reconciliations?page=1&pageSize=5'],
    ['库存汇总', '/admin/inventory/summary'],
    ['库存 SKU 列表', '/admin/inventory/skus?page=1&pageSize=5'],
    ['库存流水', '/admin/inventory/records?page=1&pageSize=5'],
    ['补货配置', '/admin/inventory/replenishment-profiles?page=1&pageSize=5'],
    ['通知列表', '/admin/notifications?page=1&pageSize=5'],
    ['通知汇总', '/admin/notifications/summary'],
    ['通知模板', '/admin/notifications/templates'],
    ['通知触发设置', '/admin/notifications/trigger-settings'],
    ['通知用户候选', '/admin/notifications/user-candidates?keyword=188&limit=5'],
    ['邀请列表', '/admin/invites?page=1&pageSize=5'],
    ['奖励记录', '/admin/rewards/records?page=1&pageSize=5'],
    ['推荐规则', '/admin/referral-rules'],
    ['奖励设置', '/admin/rewards/settings'],
    ['积分规则', '/admin/points/rules'],
    ['积分记录', '/admin/points/records?page=1&pageSize=5'],
    ['积分兑换记录', '/admin/points/gift-redemptions?page=1&pageSize=5'],
    ['站点功能开关', '/admin/settings/features'],
    ['Telegram 状态', '/admin/telegram/status'],
    ['Telegram 设置', '/admin/telegram/settings'],
    ['Telegram 日志', '/admin/telegram/logs?page=1&pageSize=5'],
    ['回收站', '/admin/recycle-bin?page=1&pageSize=5'],
    ['操作日志', '/admin/audit-logs?page=1&pageSize=5'],
    ['安全告警', '/admin/security/alerts?page=1&pageSize=5'],
    ['报表概览', '/admin/reports/overview'],
    ['销售日报', '/admin/reports/sales/daily'],
    ['销售月报', '/admin/reports/sales/monthly'],
    ['利润日报', '/admin/reports/profit/daily'],
    ['利润月报', '/admin/reports/profit/monthly'],
    ['商品分析', '/admin/reports/products/analysis'],
    ['分类分析', '/admin/reports/categories/analysis'],
    ['订单分析', '/admin/reports/orders/analysis'],
    ['客户分析', '/admin/reports/customers/analysis'],
    ['活动分析', '/admin/reports/activities/analysis'],
    ['优惠券分析', '/admin/reports/coupons/analysis'],
    ['库存分析', '/admin/reports/inventory/analysis'],
    ['搜索分析', '/admin/reports/search/analysis'],
    ['流量分析', '/admin/reports/traffic'],
    ['首页参与报表', '/admin/reports/home-engagement'],
    ['经营支出列表', '/admin/expenses'],
    ['导出任务列表', '/admin/exports'],
  ];
  for (const [name, path] of normalEndpoints) {
    await run(name, () => api('GET', path));
  }

  await ensureSensitiveAction('rbac_admin');
  for (const [name, path] of [
    ['RBAC 角色列表', '/admin/rbac/roles'],
    ['RBAC MFA 策略', '/admin/rbac/mfa-policy'],
  ]) {
    await run(name, () => api('GET', path));
  }

  await ensureSensitiveAction('bulk_inventory');
  for (const [name, path] of [
    ['补货提醒', '/admin/inventory/replenishment-alerts?page=1&pageSize=5'],
    ['采购单列表', '/admin/purchase-orders?page=1&pageSize=5'],
    ['拆装转换记录', '/admin/inventory/conversions?page=1&pageSize=5'],
  ]) {
    await run(name, () => api('GET', path));
  }
}

async function cleanupOldSmokeRoles() {
  await ensureSensitiveAction('rbac_admin');
  const roles = await run('清理上次遗留的临时 RBAC 角色：读取角色', () => api('GET', '/admin/rbac/roles'));
  for (const role of listFrom(roles)) {
    const code = String(role.code || '');
    const name = String(role.name || '');
    if (code.startsWith('smoke_') || name.includes('后台检测临时角色')) {
      await run(`清理上次遗留的临时 RBAC 角色 ${role.id}`, () => api('DELETE', `/admin/rbac/roles/${encodeURIComponent(role.id)}`));
    }
  }
}

async function testRbacWrites() {
  await ensureSensitiveAction('rbac_admin');
  const code = `smoke_${Date.now().toString(36)}`;
  const created = await run('RBAC 角色新增', () => api('POST', '/admin/rbac/roles', {
    code,
    name: `后台检测临时角色 ${RUN_ID}`,
    description: '本地 smoke 测试临时角色，测试后删除',
    permissionIds: [],
  }));
  const roleId = created?.id || created?.data?.id;
  if (!roleId) return;
  state.cleanup.push({
    name: `RBAC 角色 ${roleId}`,
    actionClass: 'rbac_admin',
    fn: () => api('DELETE', `/admin/rbac/roles/${encodeURIComponent(roleId)}`),
  });
  await run('RBAC 角色修改', () => api('PUT', `/admin/rbac/roles/${encodeURIComponent(roleId)}`, {
    name: `后台检测临时角色已修改 ${RUN_ID}`,
    description: '本地 smoke 测试更新',
    permissionIds: [],
  }));
}

async function testCategoryWrites() {
  const created = await run('分类新增', () => api('POST', '/admin/categories', {
    name: `后台检测临时分类 ${RUN_ID}`,
    description: '本地 smoke 测试临时分类',
    icon: 'test',
    sort_order: 9999,
    is_visible: false,
  }));
  const id = created?.id;
  if (!id) return;
  state.cleanup.push({
    name: `分类 ${id}`,
    fn: () => api('DELETE', `/admin/categories/${encodeURIComponent(id)}`),
  });
  await run('分类修改', () => api('PUT', `/admin/categories/${encodeURIComponent(id)}`, {
    name: `后台检测临时分类已修改 ${RUN_ID}`,
    description: '本地 smoke 测试临时分类已修改',
    sort_order: 9998,
    is_visible: false,
  }));
  const tree = await api('GET', '/admin/categories');
  const flat = flattenCategories(tree);
  const ids = flat.map((item) => item.id).filter(Boolean);
  if (ids.includes(id)) {
    await run('分类排序', () => api('PUT', '/admin/categories/sort', {
      items: flat.map((item, index) => ({
        id: item.id,
        parent_id: item.parent_id || null,
        sort_order: Number.isFinite(Number(item.sort_order)) ? Number(item.sort_order) : index,
      })),
    }));
  }
}

async function testBannerWrites() {
  const created = await run('Banner 新增', () => api('POST', '/admin/banners', {
    title: `后台检测临时 Banner ${RUN_ID}`,
    description: '本地 smoke 测试临时 Banner',
    image: '/assets/banner1.jpg',
    link: '/products',
    sort_order: 9999,
    enabled: false,
    publish_status: 'draft',
  }));
  const id = created?.id;
  if (!id) return;
  state.cleanup.push({
    name: `Banner ${id}`,
    fn: () => api('DELETE', `/admin/banners/${encodeURIComponent(id)}`),
  });
  await run('Banner 修改', () => api('PUT', `/admin/banners/${encodeURIComponent(id)}`, {
    title: `后台检测临时 Banner 已修改 ${RUN_ID}`,
    enabled: false,
    publish_status: 'draft',
  }));
}

async function testProductTagWrites() {
  const created = await run('商品标签新增', () => api('POST', '/admin/product-tags', {
    name: `后台检测临时商品标签 ${RUN_ID}`,
    color: 'blue',
    sort_order: 9999,
    enabled: true,
  }));
  const id = created?.id;
  if (!id) return;
  state.cleanup.push({
    name: `商品标签 ${id}`,
    fn: () => api('DELETE', `/admin/product-tags/${encodeURIComponent(id)}`),
  });
  await run('商品标签修改', () => api('PUT', `/admin/product-tags/${encodeURIComponent(id)}`, {
    name: `后台检测临时商品标签已修改 ${RUN_ID}`,
    color: 'green',
    sort_order: 9998,
    enabled: true,
  }));
}

async function testShippingTemplateWrites() {
  const created = await run('配送模板新增', () => api('POST', '/admin/shipping/templates', {
    name: `后台检测临时配送 ${RUN_ID}`,
    regions: 'Kuala Lumpur, Selangor',
    baseFee: 7,
    freeAbove: 180,
    extraPerKg: 2,
    enabled: true,
    isDefault: false,
  }));
  const id = created?.id;
  if (!id) return;
  state.cleanup.push({
    name: `配送模板 ${id}`,
    fn: () => api('DELETE', `/admin/shipping/templates/${encodeURIComponent(id)}`),
  });
  await run('配送模板修改', () => api('PUT', `/admin/shipping/templates/${encodeURIComponent(id)}`, {
    name: `后台检测临时配送已修改 ${RUN_ID}`,
    regions: 'Kuala Lumpur, Selangor, Penang',
    baseFee: 8,
    freeAbove: 199,
    extraPerKg: 3,
    enabled: true,
    isDefault: false,
  }));
}

async function testMemberLevelWrites() {
  const created = await run('会员等级新增', () => api('POST', '/admin/member-levels', {
    name: `后台检测临时会员 ${RUN_ID}`,
    description: '本地 smoke 测试临时会员等级',
    min_spent: 99999,
    min_orders: 999,
    discount_rate: 0.99,
    points_multiplier: 1,
    free_shipping_enabled: false,
    sort_order: 9999,
    enabled: true,
    is_default: false,
  }));
  const id = created?.id || created?.data?.id;
  if (!id) return;
  state.cleanup.push({
    name: `会员等级 ${id}`,
    fn: () => api('DELETE', `/admin/member-levels/${encodeURIComponent(id)}`),
  });
  await run('会员等级修改', () => api('PUT', `/admin/member-levels/${encodeURIComponent(id)}`, {
    name: `后台检测临时会员已修改 ${RUN_ID}`,
    description: '本地 smoke 测试临时会员等级已修改',
    min_spent: 99998,
    min_orders: 998,
    discount_rate: 0.98,
    points_multiplier: 1.1,
    free_shipping_enabled: false,
    sort_order: 9998,
    enabled: true,
    is_default: false,
  }));
}

async function testUserTagWrites() {
  const created = await run('用户标签新增', () => api('POST', '/admin/user-tags', {
    name: `后台检测临时用户标签 ${RUN_ID}`,
    color: '金色',
    description: '本地 smoke 测试临时用户标签',
    sort_order: 9999,
  }));
  const id = created?.id;
  if (!id) return;
  state.cleanup.push({
    name: `用户标签 ${id}`,
    fn: () => api('DELETE', `/admin/user-tags/${encodeURIComponent(id)}`),
  });
  await run('用户标签修改', () => api('PUT', `/admin/user-tags/${encodeURIComponent(id)}`, {
    name: `后台检测临时用户标签已修改 ${RUN_ID}`,
    color: '蓝色',
    description: '本地 smoke 测试临时用户标签已修改',
    sort_order: 9998,
  }));
  await run('用户标签影响人数', () => api('GET', `/admin/user-tags/${encodeURIComponent(id)}/impact`));

  const users = await run('用户列表用于标签测试', () => api('GET', '/admin/users?page=1&pageSize=20'));
  const normalUser = listFrom(users).find((item) => !['admin', 'super_admin'].includes(String(item.role || '').toLowerCase()));
  if (!normalUser?.id) {
    state.results.skipped.push({ name: '用户打标签/批量打标签', message: '本地没有可安全操作的普通用户' });
    console.warn('SKIP 用户打标签/批量打标签: 本地没有可安全操作的普通用户');
    return;
  }
  await run('用户设置标签', () => api('PUT', `/admin/users/${encodeURIComponent(normalUser.id)}/tags`, { tagIds: [id] }));
  await run('用户批量打标签', () => api('PUT', '/admin/users/tags/batch', { tagId: id, userIds: [normalUser.id] }));
}

async function testExpenseWrites() {
  const created = await run('经营支出新增', () => api('POST', '/admin/expenses', {
    expense_date: today(),
    category: 'local_smoke',
    amount: 12.34,
    title: `后台检测临时支出 ${RUN_ID}`,
    remark: '本地 smoke 测试临时支出，测试后删除',
  }));
  const id = created?.id;
  if (!id) return;
  state.cleanup.push({
    name: `经营支出 ${id}`,
    fn: () => api('DELETE', `/admin/expenses/${encodeURIComponent(id)}`),
  });
  await run('经营支出修改', () => api('PUT', `/admin/expenses/${encodeURIComponent(id)}`, {
    expense_date: today(),
    category: 'local_smoke',
    amount: 23.45,
    title: `后台检测临时支出已修改 ${RUN_ID}`,
    remark: '本地 smoke 测试临时支出已修改',
  }));
}

async function testNotificationUtilities() {
  await run('通知解析用户', () => api('POST', '/admin/notifications/resolve-users', { identifiers: [] }));
  await run('通知人群预估', () => api('POST', '/admin/notifications/audience-estimate', { audience_type: 'all' }));
  await run('通知触发规则预览', () => api('POST', '/admin/notifications/trigger-settings/preview', {
    key: 'order_created',
    vars: { orderNo: 'LOCAL-SMOKE-ORDER' },
  }));
  const draft = await run('通知草稿新增', () => api('POST', '/admin/notifications/drafts', {
    type: 'promotion',
    title: `后台检测临时通知草稿 ${RUN_ID}`,
    content: '本地 smoke 测试临时通知草稿，测试后删除',
    audience_type: 'all',
    link_url: '/products',
  }));
  const draftId = draft?.id;
  if (draftId) {
    state.cleanup.push({
      name: `通知草稿 ${draftId}`,
      fn: () => api('DELETE', `/admin/notifications/${encodeURIComponent(draftId)}/draft`),
    });
    await run('通知详情', () => api('GET', `/admin/notifications/${encodeURIComponent(draftId)}`));
  }
  const scheduled = await run('定时通知新增', () => api('POST', '/admin/notifications', {
    type: 'promotion',
    title: `后台检测临时定时通知 ${RUN_ID}`,
    content: '本地 smoke 测试临时定时通知，测试后取消',
    audience_type: 'all',
    link_url: '/products',
    scheduled_at: futureDateTime(3),
  }));
  const scheduledId = scheduled?.id;
  if (scheduledId) {
    await run('定时通知取消', () => api('PUT', `/admin/notifications/${encodeURIComponent(scheduledId)}/cancel`, {}));
  }
}

async function testInventoryUtilities() {
  const page = await run('库存 SKU 查询用于写入测试', () => api('GET', `/admin/inventory/skus?page=1&pageSize=20&keyword=LOCAL`));
  const sku = listFrom(page).find((item) => item.variant_id || item.variantId || item.id);
  const variantId = sku?.variant_id || sku?.variantId || sku?.id;
  if (!variantId) {
    state.results.skipped.push({ name: '库存阈值/批量库存写入', message: '本地没有 LOCAL 测试 SKU' });
    console.warn('SKIP 库存阈值/批量库存写入: 本地没有 LOCAL 测试 SKU');
    return;
  }
  await run('SKU 预警阈值修改', () => api('PATCH', `/admin/inventory/skus/${encodeURIComponent(variantId)}/warning-threshold`, {
    stock_warning_threshold: 5,
  }));
  await ensureSensitiveAction('bulk_inventory');
  await run('SKU 批量预警阈值修改', () => api('POST', '/admin/inventory/batch-warning-threshold', {
    variant_ids: [variantId],
    stock_warning_threshold: 6,
  }));
  await run('SKU 批量库存调整', () => api('POST', '/admin/inventory/batch-adjust', {
    items: [{ variant_id: variantId, change_type: 'adjust', quantity: 6 }],
    reason: '本地 smoke 测试库存批量调整',
    remark: RUN_ID,
  }));
}

async function testPointsUtilities() {
  const products = await run('商品列表用于积分规则测试', () => api('GET', '/admin/products?page=1&pageSize=20&keyword=本地'));
  const product = listFrom(products)[0];
  if (!product?.id) {
    state.results.skipped.push({ name: '积分商品规则新增/修改/删除', message: '本地没有可用于积分规则的商品' });
    console.warn('SKIP 积分商品规则新增/修改/删除: 本地没有可用于积分规则的商品');
    return;
  }
  const created = await run('积分商品规则新增', () => api('POST', '/admin/points/product-rules', {
    name: `后台检测临时积分规则 ${RUN_ID}`,
    scope_type: 'product',
    scope_id: product.id,
    priority: 9999,
    earn_enabled: true,
    earn_mode: 'fixed',
    fixed_points: 1,
    redeem_enabled: false,
    enabled: false,
  }));
  const id = created?.id || created?.data?.id;
  if (id) {
    state.cleanup.push({
      name: `积分商品规则 ${id}`,
      fn: () => api('DELETE', `/admin/points/product-rules/${encodeURIComponent(id)}`),
    });
    await run('积分商品规则修改', () => api('PUT', `/admin/points/product-rules/${encodeURIComponent(id)}`, {
      name: `后台检测临时积分规则已修改 ${RUN_ID}`,
      scope_type: 'product',
      scope_id: product.id,
      priority: 9998,
      earn_enabled: true,
      earn_mode: 'fixed',
      fixed_points: 2,
      redeem_enabled: false,
      enabled: false,
    }));
  }
  const gift = await run('积分礼品新增', () => api('POST', '/admin/points/gift-items', {
    product_id: product.id,
    variant_id: product.variants?.[0]?.id || null,
    title: `后台检测临时积分礼品 ${RUN_ID}`,
    image: '/assets/banner1.jpg',
    required_points: 999999,
    cash_amount: 0,
    stock_limit: 1,
    limit_per_user: 1,
    start_at: futureDateTime(1),
    end_at: futureDateTime(30),
    enabled: false,
    sort_order: 9999,
  }));
  const giftId = gift?.id || gift?.data?.id;
  if (giftId) {
    state.cleanup.push({
      name: `积分礼品 ${giftId}`,
      fn: () => api('DELETE', `/admin/points/gift-items/${encodeURIComponent(giftId)}`),
    });
    await run('积分礼品修改', () => api('PUT', `/admin/points/gift-items/${encodeURIComponent(giftId)}`, {
      product_id: product.id,
      variant_id: product.variants?.[0]?.id || null,
      title: `后台检测临时积分礼品已修改 ${RUN_ID}`,
      image: '/assets/banner1.jpg',
      required_points: 999998,
      cash_amount: 0,
      stock_limit: 2,
      limit_per_user: 1,
      start_at: futureDateTime(1),
      end_at: futureDateTime(30),
      enabled: false,
      sort_order: 9998,
    }));
  }
}

async function testConfigNoopWrites() {
  await ensureSensitiveAction('rbac_admin');
  const policy = await run('读取管理员 MFA 策略用于原值写回', () => api('GET', '/admin/rbac/mfa-policy'));
  if (policy) {
    await run('管理员 MFA 策略原值写回', () => api('PUT', '/admin/rbac/mfa-policy', { enabled: policy.enabled !== false }));
  }
  await ensureSensitiveAction('high_risk_config');
  const shipping = await run('读取配送设置用于原值写回', () => api('GET', '/admin/shipping/settings'));
  if (shipping) {
    await run('配送设置原值写回', () => api('PUT', '/admin/shipping/settings', shipping));
  }
  const points = await run('读取积分设置用于原值写回', () => api('GET', '/admin/points/settings'));
  if (points) {
    await run('积分设置原值写回', () => api('PUT', '/admin/points/settings', points));
  }
  const features = await run('读取功能开关用于原值写回', () => api('GET', '/admin/settings/features'));
  if (features) {
    await run('功能开关原值写回', () => api('PUT', '/admin/settings/features', features));
  }
  await run('Telegram 模板预览', () => api('POST', '/admin/telegram/preview', {
    event: 'order_created',
    data: { orderNo: 'LOCAL-SMOKE-ORDER', amount: 12.34 },
  }));
}

async function testExportTask() {
  await ensureSensitiveAction('customer_export');
  await run('导出任务创建', () => api('POST', '/admin/exports', {
    type: 'operating_expenses',
    params: { dateFrom: today(-7), dateTo: today() },
  }));
}

async function main() {
  assertLocalUrl(API_BASE, 'ADMIN_SMOKE_API_BASE');
  requireAdminPassword();

  console.log(`Local admin smoke started. API=${API_BASE}, run=${RUN_ID}`);
  await run('后台登录/MFA', () => loginAdmin(), { allowSkip: false });
  if (!state.token) throw new Error('No admin token, aborting.');

  try {
    await cleanupOldSmokeRoles();
    await testReadOnlyEndpoints();
    await testRbacWrites();
    await testCategoryWrites();
    await testBannerWrites();
    await testProductTagWrites();
    await testShippingTemplateWrites();
    await testMemberLevelWrites();
    await testUserTagWrites();
    await testExpenseWrites();
    await testNotificationUtilities();
    await testInventoryUtilities();
    await testPointsUtilities();
    await testConfigNoopWrites();
    await testExportTask();
  } finally {
    await cleanupAll();
  }

  const summary = {
    runId: RUN_ID,
    apiBase: API_BASE,
    counts: {
      ok: state.results.ok.length,
      incomplete: state.results.incomplete.length,
      skipped: state.results.skipped.length,
      failed: state.results.failed.length,
    },
    results: state.results,
  };
  console.log('\nADMIN_UNCOVERED_SMOKE_RESULT_START');
  console.log(JSON.stringify(summary, null, 2));
  console.log('ADMIN_UNCOVERED_SMOKE_RESULT_END');
  if (state.results.failed.length) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

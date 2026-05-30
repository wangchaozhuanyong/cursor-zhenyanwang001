/**
 * Seed realistic local preview content through admin HTTP APIs.
 *
 * Safety notes:
 * - Data writes go through /api/admin endpoints.
 * - The script refuses non-local API hosts by default.
 * - Admin password must come from ADMIN_PASSWORD env; no real secret is stored here.
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const API_BASE = String(process.env.ADMIN_SEED_API_BASE || 'http://127.0.0.1:3000/api').replace(/\/+$/, '');
const PUBLIC_API_BASE = String(process.env.ADMIN_SEED_PUBLIC_API_BASE || API_BASE).replace(/\/+$/, '');
const ADMIN_PHONE = String(process.env.ADMIN_PHONE || '18800000001').trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || '').trim();
const ALLOW_REMOTE = process.env.ALLOW_ADMIN_SEED_REMOTE === '1';
const ALLOW_LOCAL_MFA_RESET = process.env.ALLOW_LOCAL_MFA_RESET === '1';

const LOCAL_HOSTS = new Set(['127.0.0.1', 'localhost', '::1']);
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const FALLBACK_IMAGE = '/assets/banner1.jpg';
const RUN_LABEL = new Date().toISOString().slice(0, 19).replace('T', ' ');

const state = {
  token: '',
  csrfToken: '',
  mfaSecret: '',
  sensitiveActionTokens: {},
  activeSensitiveActionToken: '',
  uploadUrl: '',
  categories: {},
  tags: {},
  products: {},
  coupons: {},
  banners: {},
  contentPages: {},
  memberLevels: {},
  report: {
    requiredOk: [],
    requiredFailed: [],
    optionalOk: [],
    optionalFailed: [],
    publicChecks: [],
  },
};

function assertLocalUrl(rawUrl, label) {
  const url = new URL(rawUrl);
  if (ALLOW_REMOTE) return;
  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(`${label} 不是本地地址：${rawUrl}。如确实要远程执行，请显式设置 ALLOW_ADMIN_SEED_REMOTE=1。`);
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('当前 NODE_ENV=production，拒绝写入模拟数据。');
  }
}

function requireAdminPassword() {
  if (!ADMIN_PASSWORD) {
    throw new Error('缺少 ADMIN_PASSWORD 环境变量。为了安全，脚本不会把管理员密码写死在代码里。');
  }
}

function base32ToBuffer(input) {
  const clean = String(input || '').replace(/=+$/g, '').replace(/\s+/g, '').toUpperCase();
  let bits = '';
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, '0');
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

async function readJsonResponse(res, requestLabel) {
  const text = await res.text();
  let body;
  try {
    body = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`${requestLabel} 返回的不是 JSON：HTTP ${res.status} ${text.slice(0, 200)}`);
  }
  if (!res.ok || body.code !== 0) {
    const err = new Error(`${requestLabel} 失败：HTTP ${res.status} / code ${body.code ?? 'unknown'} / ${body.message || '无错误信息'}`);
    err.status = res.status;
    err.body = body;
    throw err;
  }
  return body.data;
}

async function api(method, apiPath, body = undefined) {
  const headers = {
    Authorization: `Bearer ${state.token}`,
    'User-Agent': 'CodexLocalAdminSeed/1.0',
  };
  const cookies = [];
  if (state.csrfToken) cookies.push(`admin_csrf_token=${encodeURIComponent(state.csrfToken)}`);
  if (state.activeSensitiveActionToken) {
    cookies.push(`admin_sensitive_action_token=${encodeURIComponent(state.activeSensitiveActionToken)}`);
  }
  if (cookies.length) headers.Cookie = cookies.join('; ');
  if (!['GET', 'HEAD', 'OPTIONS'].includes(String(method).toUpperCase())) {
    headers.Origin = new URL(API_BASE).origin;
    if (state.csrfToken) {
      headers['X-CSRF-Token'] = state.csrfToken;
    }
  }
  const options = { method, headers };
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }
  const res = await fetch(`${API_BASE}${apiPath}`, options);
  return readJsonResponse(res, `${method} ${apiPath}`);
}

async function publicApi(apiPath) {
  const res = await fetch(`${PUBLIC_API_BASE}${apiPath}`, {
    headers: { 'User-Agent': 'CodexLocalAdminSeed/1.0' },
  });
  return readJsonResponse(res, `GET ${apiPath}`);
}

async function localResetAdminMfa() {
  if (!ALLOW_LOCAL_MFA_RESET) return false;
  assertLocalUrl(API_BASE, 'ADMIN_SEED_API_BASE');
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
      `SELECT id, phone FROM users WHERE phone IN (${marks}) AND role IN ('admin', 'super_admin') LIMIT 1`,
      candidates,
    );
    if (!user) throw new Error('本地库里没有找到对应管理员，无法重置 MFA。');
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
      'User-Agent': 'CodexLocalAdminSeed/1.0',
    },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok || body.code !== 0) {
    throw new Error(`后台登录失败：HTTP ${res.status} / ${body.message || '无错误信息'}`);
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
        'User-Agent': 'CodexLocalAdminSeed/1.0',
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
      throw new Error(`后台 MFA 绑定验证失败：HTTP ${verifyRes.status} / ${verifyBody.message || '无错误信息'}`);
    }
    state.token = tokenFrom(verifyBody.data || {});
    state.csrfToken = verifyBody.data?.csrfToken || state.csrfToken;
    if (!state.token) throw new Error('后台 MFA 验证成功，但响应里没有 access token。');
    return { mode: 'mfa_setup' };
  }

  if (data.mfaRequired && data.mfaTicket && process.env.ADMIN_MFA_CODE) {
    const verifyRes = await fetch(`${API_BASE}/admin/auth/mfa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'CodexLocalAdminSeed/1.0',
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
      throw new Error(`后台 MFA 验证失败：HTTP ${verifyRes.status} / ${verifyBody.message || '无错误信息'}`);
    }
    state.token = tokenFrom(verifyBody.data || {});
    state.csrfToken = verifyBody.data?.csrfToken || state.csrfToken;
    if (!state.token) throw new Error('后台 MFA 验证成功，但响应里没有 access token。');
    return { mode: 'mfa_code' };
  }

  if (data.mfaRequired && allowResetRetry && await localResetAdminMfa()) {
    return loginAdmin({ allowResetRetry: false });
  }

  throw new Error('后台登录需要 MFA。请设置 ADMIN_MFA_CODE，或在本地执行时设置 ALLOW_LOCAL_MFA_RESET=1。');
}

async function ensureSensitiveAction(actionClass) {
  if (state.sensitiveActionTokens[actionClass]) {
    state.activeSensitiveActionToken = state.sensitiveActionTokens[actionClass];
    return state.activeSensitiveActionToken;
  }
  const code = state.mfaSecret ? totp(state.mfaSecret) : String(process.env.ADMIN_MFA_CODE || '').trim();
  if (!code) {
    throw new Error(`高风险接口需要 Step-up MFA，但脚本没有可用验证码：${actionClass}`);
  }
  const data = await api('POST', '/admin/auth/mfa/reverify', { code, actionClass });
  const token = data?.sensitiveActionToken || '';
  if (!token) throw new Error(`Step-up MFA 成功但没有返回敏感操作 token：${actionClass}`);
  state.sensitiveActionTokens[actionClass] = token;
  state.activeSensitiveActionToken = token;
  if (data.csrfToken) state.csrfToken = data.csrfToken;
  return token;
}

async function step(name, fn, { optional = false } = {}) {
  const target = optional ? state.report.optionalOk : state.report.requiredOk;
  const failures = optional ? state.report.optionalFailed : state.report.requiredFailed;
  try {
    const data = await fn();
    target.push(name);
    console.log(`  OK ${name}`);
    return data;
  } catch (err) {
    failures.push({ name, message: err.message });
    console.warn(`  FAIL ${name}: ${err.message}`);
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
  walk(list);
  return out;
}

function today(offsetDays = 0) {
  const d = new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

function datetime(offsetDays = 0, time = '09:00:00') {
  return `${today(offsetDays)} ${time}`;
}

function imageUrl() {
  return state.uploadUrl || FALLBACK_IMAGE;
}

async function ensureCategory(payload) {
  const list = flattenCategories(await api('GET', '/admin/categories'));
  const existing = list.find((item) => item.name === payload.name);
  if (existing) {
    await api('PUT', `/admin/categories/${existing.id}`, payload);
    return { ...existing, ...payload };
  }
  return api('POST', '/admin/categories', payload);
}

async function ensureTag(payload) {
  const list = await api('GET', '/admin/product-tags');
  const existing = (list || []).find((item) => item.name === payload.name);
  if (existing) return api('PUT', `/admin/product-tags/${existing.id}`, payload);
  return api('POST', '/admin/product-tags', payload);
}

async function ensureProduct(payload) {
  const params = new URLSearchParams({ page: '1', pageSize: '50', keyword: payload.name });
  const page = await api('GET', `/admin/products?${params.toString()}`);
  const existing = (page.list || []).find((item) => item.name === payload.name);
  if (existing) {
    // Existing SKUs may already have inventory records. Updating with fresh
    // variant payloads would be interpreted as deleting old SKUs, so only
    // refresh base product fields on reruns.
    const { variants, spec_groups, ...safeUpdatePayload } = payload;
    const updated = await api('PUT', `/admin/products/${existing.id}`, safeUpdatePayload);
    return updated || { ...existing, ...payload };
  }
  return api('POST', '/admin/products', payload);
}

async function ensureBanner(payload) {
  const list = await api('GET', '/admin/banners');
  const existing = (list || []).find((item) => item.title === payload.title);
  if (existing) {
    await api('PUT', `/admin/banners/${existing.id}`, payload);
    return { ...existing, ...payload };
  }
  return api('POST', '/admin/banners', payload);
}

async function ensureCoupon(payload) {
  const page = await api('GET', '/admin/coupons?page=1&pageSize=100');
  const existing = (page.list || []).find((item) => item.code === payload.code);
  if (existing) {
    await api('PUT', `/admin/coupons/${existing.id}`, payload);
    return { ...existing, ...payload };
  }
  return api('POST', '/admin/coupons', payload);
}

async function ensureContentPage(payload) {
  const list = await api('GET', '/admin/content');
  const existing = (list || []).find((item) => item.slug === payload.slug);
  if (existing) {
    await api('PUT', `/admin/content/${existing.id}`, payload);
    return { ...existing, ...payload };
  }
  return api('POST', '/admin/content', payload);
}

async function ensureNavItem(payload) {
  const list = await api('GET', '/admin/home-ops/nav-items');
  const existing = (list || []).find((item) => item.title === payload.title);
  if (existing) {
    await api('PUT', `/admin/home-ops/nav-items/${existing.id}`, payload);
    return { ...existing, ...payload };
  }
  return api('POST', '/admin/home-ops/nav-items', payload);
}

async function ensureMemberLevel(payload) {
  const list = await api('GET', '/admin/member-levels');
  const existing = (list || []).find((item) => item.name === payload.name);
  if (existing) {
    await api('PUT', `/admin/member-levels/${existing.id}`, payload);
    return { ...existing, ...payload };
  }
  return api('POST', '/admin/member-levels', payload);
}

async function ensureShippingTemplate(payload) {
  const list = await api('GET', '/admin/shipping/templates');
  const existing = (list || []).find((item) => item.name === payload.name);
  if (existing) {
    await api('PUT', `/admin/shipping/templates/${existing.id}`, payload);
    return { ...existing, ...payload };
  }
  return api('POST', '/admin/shipping/templates', payload);
}

async function ensureActivity(payload) {
  const page = await api('GET', '/admin/activities?page=1&pageSize=50');
  const existing = (page.list || []).find((item) => item.title === payload.title);
  if (existing) return api('PUT', `/admin/activities/${existing.id}`, payload);
  return api('POST', '/admin/activities', payload);
}

async function ensurePointsProductRule(payload) {
  const page = await api('GET', '/admin/points/product-rules?page=1&pageSize=100');
  const existing = (page.list || []).find((item) => item.name === payload.name);
  if (existing) return api('PUT', `/admin/points/product-rules/${existing.id}`, payload);
  return api('POST', '/admin/points/product-rules', payload);
}

async function ensureGiftItem(payload) {
  const page = await api('GET', '/admin/points/gift-items?page=1&pageSize=100');
  const existing = (page.list || []).find((item) => item.title === payload.title);
  if (existing) return api('PUT', `/admin/points/gift-items/${existing.id}`, payload);
  return api('POST', '/admin/points/gift-items', payload);
}

async function uploadPreviewImage() {
  const filePath = path.join(__dirname, '..', '..', 'click-send-shop-main', 'click-send-shop-main', 'public', 'assets', 'banner1.jpg');
  const image = fs.readFileSync(filePath);
  const form = new FormData();
  form.append('mode', 'product');
  form.append('file', new Blob([image], { type: 'image/jpeg' }), 'local-preview-card.jpg');
  const res = await fetch(`${API_BASE}/admin/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${state.token}`,
      'User-Agent': 'CodexLocalAdminSeed/1.0',
      Origin: new URL(API_BASE).origin,
      'X-CSRF-Token': state.csrfToken,
      Cookie: `admin_csrf_token=${encodeURIComponent(state.csrfToken)}`,
    },
    body: form,
  });
  const data = await readJsonResponse(res, 'POST /admin/upload');
  state.uploadUrl = data.url || data.variants?.webp || '';
  return data;
}

async function seedCategoriesAndTags() {
  const categoryPayloads = [
    {
      name: '手机数码',
      description: '手机配件、智能设备、快充线材，适合本地页面预览。',
      buying_guide: '建议按品牌、功率、接口类型筛选；快充类商品注意设备兼容性。',
      faq: [{ question: '这些是本地真实订单吗？', answer: '不是，这是本地预览模拟数据，只用于开发测试。' }],
      seo_title: '手机数码本地预览分类',
      seo_description: '本地开发环境用的手机数码分类内容。',
      icon_url: imageUrl(),
      sort_order: 10,
      is_visible: true,
    },
    {
      name: '居家生活',
      description: '家居收纳、香薰、清洁用品，用来测试生活方式类卡片布局。',
      buying_guide: '可重点测试多图、长描述、活动角标和推荐位。',
      faq: [{ question: '可以删除吗？', answer: '可以，这是本地模拟内容。' }],
      seo_title: '居家生活本地预览分类',
      seo_description: '本地开发环境用的居家生活分类内容。',
      icon_url: imageUrl(),
      sort_order: 20,
      is_visible: true,
    },
    {
      name: '美妆个护',
      description: '护肤、清洁、护理套装，方便测试图片比例和详情页排版。',
      buying_guide: '注意测试功效说明、规格展示和售后说明区域。',
      faq: [{ question: '会同步到线上吗？', answer: '不会，除非你主动连接线上数据库执行。' }],
      seo_title: '美妆个护本地预览分类',
      seo_description: '本地开发环境用的美妆个护分类内容。',
      icon_url: imageUrl(),
      sort_order: 30,
      is_visible: true,
    },
    {
      name: '母婴玩具',
      description: '母婴用品和益智玩具，用于测试分类树和商品筛选。',
      buying_guide: '注意年龄段、材质、安全说明等字段展示。',
      faq: [{ question: '图片为什么相似？', answer: '本地模拟优先保证布局可测，后续可换真实素材。' }],
      seo_title: '母婴玩具本地预览分类',
      seo_description: '本地开发环境用的母婴玩具分类内容。',
      icon_url: imageUrl(),
      sort_order: 40,
      is_visible: true,
    },
    {
      name: '马来西亚本地服务',
      description: '配送、咨询和售后服务类展示，用于测试非实物商品布局。',
      buying_guide: '地址、城市名、配送范围建议保留英文，如 Kuala Lumpur、Selangor。',
      faq: [{ question: '为什么有英文地址？', answer: '马来西亚地址和城市名实际使用英文更自然。' }],
      seo_title: '马来西亚本地服务预览分类',
      seo_description: '本地开发环境用的服务类分类内容。',
      icon_url: imageUrl(),
      sort_order: 50,
      is_visible: true,
    },
    {
      name: '企业采购',
      description: '办公、礼品、批量采购商品，用于测试 B2B 内容块。',
      buying_guide: '可测试批量价格、库存预警、客服入口和内容页跳转。',
      faq: [{ question: '能不能下真实订单？', answer: '本地环境不建议接真实支付，只做流程测试。' }],
      seo_title: '企业采购本地预览分类',
      seo_description: '本地开发环境用的企业采购分类内容。',
      icon_url: imageUrl(),
      sort_order: 60,
      is_visible: true,
    },
  ];

  for (const payload of categoryPayloads) {
    const category = await ensureCategory(payload);
    state.categories[payload.name] = category;
  }

  const tagPayloads = [
    { name: '本地现货', color: 'green', sort_order: 10, enabled: true },
    { name: '热卖', color: 'red', sort_order: 20, enabled: true },
    { name: '新品', color: 'blue', sort_order: 30, enabled: true },
    { name: '组合优惠', color: 'gold', sort_order: 40, enabled: true },
  ];
  for (const payload of tagPayloads) {
    const tag = await ensureTag(payload);
    state.tags[payload.name] = tag;
  }
}

function productPayloads() {
  const cat = (name) => state.categories[name]?.id || '';
  const tagIds = (...names) => names.map((name) => state.tags[name]?.id).filter(Boolean);
  const img = imageUrl();
  return [
    {
      name: '小米智能手环 9 本地预览套装',
      category_id: cat('手机数码'),
      cover_image: img,
      images: [img, '/assets/home-banners/home-hero-01-platform-bg.webp'],
      price: 189,
      original_price: 239,
      stock: 120,
      stock_warning_threshold: 20,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -900,
      is_recommended: true,
      is_new: true,
      is_hot: true,
      tag_ids: tagIds('本地现货', '热卖'),
      description: '<h2>本地预览商品</h2><p>用于测试商品卡片、详情页、库存、标签和推荐位。支持中文长文案展示。</p><ul><li>含中文标题</li><li>含多图</li><li>含规格和库存</li></ul>',
      variants: [
        { title: '黑色标准版', sku_code: 'LOCAL-BAND9-BLK', price: 189, original_price: 239, stock: 70, cost_price: 110, is_default: true, enabled: true },
        { title: '粉色标准版', sku_code: 'LOCAL-BAND9-PNK', price: 199, original_price: 249, stock: 50, cost_price: 118, enabled: true },
      ],
    },
    {
      name: 'Type-C 快充线材三件套',
      category_id: cat('手机数码'),
      cover_image: img,
      images: [img],
      price: 49,
      original_price: 79,
      stock: 260,
      stock_warning_threshold: 30,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -890,
      is_recommended: true,
      is_hot: true,
      tag_ids: tagIds('本地现货', '组合优惠'),
      description: '<p>用于测试低价商品、组合套装、批量库存和移动端卡片换行。</p>',
      variants: [
        { title: '1 米套装', sku_code: 'LOCAL-CABLE-1M', price: 49, stock: 160, cost_price: 22, is_default: true, enabled: true },
        { title: '2 米套装', sku_code: 'LOCAL-CABLE-2M', price: 59, stock: 100, cost_price: 28, enabled: true },
      ],
    },
    {
      name: '马来西亚榴莲礼盒本地测试',
      category_id: cat('马来西亚本地服务'),
      cover_image: img,
      images: [img],
      price: 168,
      original_price: 218,
      stock: 80,
      stock_warning_threshold: 12,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -880,
      is_new: true,
      tag_ids: tagIds('新品'),
      description: '<p>配送地址示例：Jalan Ampang, Kuala Lumpur。这里保留英文地址，方便测试真实马来西亚地址排版。</p>',
      variants: [
        { title: 'Kuala Lumpur 配送', sku_code: 'LOCAL-DURIAN-KL', price: 168, stock: 50, cost_price: 102, is_default: true, enabled: true },
        { title: 'Selangor 配送', sku_code: 'LOCAL-DURIAN-SGR', price: 178, stock: 30, cost_price: 108, enabled: true },
      ],
    },
    {
      name: '居家香薰睡眠套装',
      category_id: cat('居家生活'),
      cover_image: img,
      images: [img],
      price: 89,
      original_price: 129,
      stock: 140,
      stock_warning_threshold: 18,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -870,
      is_recommended: true,
      tag_ids: tagIds('新品'),
      description: '<p>适合测试生活方式长标题、推荐区域和首页瀑布流视觉。</p>',
    },
    {
      name: '旅行转换插头全球版',
      category_id: cat('居家生活'),
      cover_image: img,
      images: [img],
      price: 69,
      original_price: 99,
      stock: 95,
      stock_warning_threshold: 10,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -860,
      tag_ids: tagIds('热卖'),
      description: '<p>可用于测试规格较少但描述较长的商品详情。</p>',
    },
    {
      name: '宝宝纸尿裤试用装',
      category_id: cat('母婴玩具'),
      cover_image: img,
      images: [img],
      price: 39,
      original_price: 59,
      stock: 180,
      stock_warning_threshold: 25,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -850,
      is_new: true,
      tag_ids: tagIds('新品', '组合优惠'),
      description: '<p>用于测试母婴类商品的安全提示、规格和优惠券展示。</p>',
    },
    {
      name: '企业采购欢迎包',
      category_id: cat('企业采购'),
      cover_image: img,
      images: [img],
      price: 299,
      original_price: 399,
      stock: 60,
      stock_warning_threshold: 8,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -840,
      is_recommended: true,
      tag_ids: tagIds('组合优惠'),
      description: '<p>适合测试企业采购场景、批量操作和客服入口。</p>',
    },
    {
      name: '护肤补水三件套',
      category_id: cat('美妆个护'),
      cover_image: img,
      images: [img],
      price: 129,
      original_price: 169,
      stock: 110,
      stock_warning_threshold: 15,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -830,
      tag_ids: tagIds('本地现货'),
      description: '<p>用于测试美妆个护类图片比例、详情说明和活动角标。</p>',
    },
    {
      name: '宠物清洁礼包',
      category_id: cat('居家生活'),
      cover_image: img,
      images: [img],
      price: 75,
      original_price: 99,
      stock: 125,
      stock_warning_threshold: 16,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -820,
      tag_ids: tagIds('热卖'),
      description: '<p>用于测试中等价格商品、库存预警和商品列表筛选。</p>',
    },
    {
      name: '办公室咖啡补给套装',
      category_id: cat('企业采购'),
      cover_image: img,
      images: [img],
      price: 158,
      original_price: 208,
      stock: 88,
      stock_warning_threshold: 12,
      status: 'active',
      lifecycle_status: 1,
      sort_order: -810,
      tag_ids: tagIds('组合优惠', '本地现货'),
      description: '<p>用于测试办公采购、首页推荐位和批量购买视觉。</p>',
    },
  ];
}

async function seedProducts() {
  for (const payload of productPayloads()) {
    const product = await ensureProduct(payload);
    state.products[payload.name] = product;
  }
}

async function seedBannersAndHomeOps() {
  const cleanBannerImages = [
    '/assets/home-banners/home-hero-01-platform-bg.webp',
    '/assets/home-banners/home-hero-02-visa-study-bg.webp',
    '/assets/home-banners/home-hero-03-local-goods-bg.webp',
    '/assets/home-banners/home-hero-04-renovation-bg.webp',
    '/assets/home-banners/home-hero-05-support-bg.webp',
  ];
  const legacyPreviewBannerTitles = [
    '本地预览：首页主视觉',
    '本地预览：马来西亚配送',
    '本地预览：新人优惠',
    '本地预览：企业采购',
  ];
  const banners = [
    {
      title: '大马通平台总览',
      description: '大马通面向马来西亚中文用户的一站式服务入口。',
      image: cleanBannerImages[0],
      link: '',
      sort_order: 1,
      enabled: true,
      publish_status: 'published',
    },
    {
      title: '签证留学第二家园',
      description: '适合需要了解签证、留学、第二家园服务的用户。',
      image: cleanBannerImages[1],
      link: '',
      sort_order: 2,
      enabled: true,
      publish_status: 'published',
    },
    {
      title: '本地优选与中国好物',
      description: '集合零食饮料、日用好物与精选商品。',
      image: cleanBannerImages[2],
      link: '',
      sort_order: 3,
      enabled: true,
      publish_status: 'published',
    },
    {
      title: '商业装修服务',
      description: '面向门店、办公室和商业空间的装修服务。',
      image: cleanBannerImages[3],
      link: '',
      sort_order: 4,
      enabled: true,
      publish_status: 'published',
    },
    {
      title: '本地中文客服与订单支持',
      description: '提供中文咨询、下单、售后与订单跟进。',
      image: cleanBannerImages[4],
      link: '',
      sort_order: 5,
      enabled: true,
      publish_status: 'published',
    },
  ];
  for (const payload of banners) {
    const banner = await ensureBanner(payload);
    state.banners[payload.title] = banner;
  }
  const existingBanners = await api('GET', '/admin/banners');
  for (const item of existingBanners || []) {
    if (legacyPreviewBannerTitles.includes(item.title)) {
      await api('DELETE', `/admin/banners/${item.id}`);
    }
  }

  const navItems = [
    { title: '手机数码', target_type: 'category', target_category_id: state.categories['手机数码']?.id, icon_url: imageUrl(), sort_order: 1, enabled: true },
    { title: '居家生活', target_type: 'category', target_category_id: state.categories['居家生活']?.id, icon_url: imageUrl(), sort_order: 2, enabled: true },
    { title: '美妆个护', target_type: 'category', target_category_id: state.categories['美妆个护']?.id, icon_url: imageUrl(), sort_order: 3, enabled: true },
    { title: '企业采购', target_type: 'category', target_category_id: state.categories['企业采购']?.id, icon_url: imageUrl(), sort_order: 4, enabled: true },
    { title: '全部分类', target_type: 'categories', icon_url: imageUrl(), sort_order: 5, enabled: true },
    { title: '本地预览说明', target_type: 'url', link_url: '/content/local-preview-guide', icon_url: imageUrl(), sort_order: 6, enabled: true },
  ];
  for (const payload of navItems) {
    await ensureNavItem(payload);
  }

  await api('PUT', '/admin/home-ops/settings', {
    heroTitle: '本地预览内容已准备好',
    heroSubtitle: `这些内容由后台接口在本地生成，最后更新时间：${RUN_LABEL}`,
    showRecommendedProducts: true,
    showNewProducts: true,
    showHotProducts: true,
    showCoupons: true,
    showActivities: true,
  });
}

async function seedCouponsAndActivities() {
  const coupons = [
    {
      code: 'LOCAL10OFF',
      title: '本地预览满 100 减 10',
      type: 'fixed',
      value: 10,
      min_amount: 100,
      start_date: today(-1),
      end_date: today(180),
      claim_start_at: datetime(-1),
      claim_end_at: datetime(180, '23:59:59'),
      use_start_at: datetime(-1),
      use_end_at: datetime(180, '23:59:59'),
      description: '本地模拟优惠券，用于测试领券、列表和结算展示。',
      total_quantity: 500,
      per_user_limit: 2,
      publish_status: 'active',
      issue_mode: 'manual',
      validity_mode: 'absolute',
      display_badge: '本地可领',
    },
    {
      code: 'LOCALNEW20',
      title: '新人专享 20 元券',
      type: 'fixed',
      value: 20,
      min_amount: 150,
      start_date: today(-1),
      end_date: today(180),
      description: '本地新人券，用于测试新人礼包和活动入口。',
      total_quantity: 300,
      per_user_limit: 1,
      publish_status: 'active',
      issue_mode: 'manual',
      new_user_only: true,
      validity_mode: 'absolute',
      display_badge: '新人',
    },
    {
      code: 'LOCAL8PCT',
      title: '本地预览 92 折券',
      type: 'percentage',
      value: 92,
      min_amount: 80,
      start_date: today(-1),
      end_date: today(120),
      description: '折扣券，用于测试百分比优惠展示。',
      total_quantity: 200,
      per_user_limit: 1,
      publish_status: 'active',
      issue_mode: 'manual',
      validity_mode: 'absolute',
      display_badge: '折扣',
    },
    {
      code: 'LOCALSHIP',
      title: '本地预览运费券',
      type: 'shipping',
      value: 0,
      min_amount: 120,
      start_date: today(-1),
      end_date: today(120),
      description: '运费券，用于测试免邮规则展示。',
      total_quantity: 200,
      per_user_limit: 1,
      publish_status: 'active',
      issue_mode: 'manual',
      validity_mode: 'absolute',
      display_badge: '免邮',
    },
  ];

  for (const payload of coupons) {
    const coupon = await ensureCoupon(payload);
    state.coupons[payload.code] = coupon;
  }

  const band = state.products['小米智能手环 9 本地预览套装'];
  const cable = state.products['Type-C 快充线材三件套'];
  const couponIds = Object.values(state.coupons).map((item) => item.id).filter(Boolean);
  const firstVariant = band?.variants?.[0];
  const secondVariant = cable?.variants?.[0];

  const activities = [
    {
      type: 'flash_sale',
      title: '本地预览限时秒杀',
      subtitle: '首页秒杀区测试内容',
      cover_image: imageUrl(),
      start_at: datetime(-1),
      end_at: datetime(30, '23:59:59'),
      description: '通过后台活动接口生成，用于测试秒杀模块。',
      status: 'active',
      display_positions: ['home_flash_sale', 'promotion_banner'],
      items: firstVariant ? [{
        product_id: band.id,
        variant_id: firstVariant.id,
        activity_price: 169,
        activity_stock: 30,
        limit_per_user: 2,
        sort_order: 1,
      }] : [],
      sort_order: -100,
    },
    {
      type: 'full_reduction',
      title: '本地预览满减活动',
      subtitle: '满 199 减 30',
      cover_image: imageUrl(),
      start_at: datetime(-1),
      end_at: datetime(60, '23:59:59'),
      description: '用于测试购物车和结算页满减提示。',
      status: 'active',
      threshold_amount: 199,
      discount_amount: 30,
      scope_type: 'all',
      display_positions: ['full_reduction_notice', 'cart_notice', 'checkout_notice'],
      sort_order: -90,
    },
    {
      type: 'coupon_activity',
      title: '本地预览领券中心活动',
      subtitle: '多种优惠券集中展示',
      cover_image: imageUrl(),
      start_at: datetime(-1),
      end_at: datetime(60, '23:59:59'),
      description: '用于测试首页领券中心。',
      status: couponIds.length ? 'active' : 'draft',
      activity_config: { coupon_ids: couponIds.slice(0, 3) },
      scope_type: 'all',
      display_positions: ['home_coupon_center', 'promotion_banner'],
      sort_order: -80,
    },
    {
      type: 'new_user_gift',
      title: '本地预览新人礼包',
      subtitle: '注册后可领取新人券包',
      cover_image: imageUrl(),
      start_at: datetime(-1),
      end_at: datetime(90, '23:59:59'),
      description: '用于测试新人礼包模块。',
      status: couponIds.length ? 'active' : 'draft',
      activity_config: { coupon_ids: couponIds.slice(0, 2) },
      scope_type: 'new_user',
      display_positions: ['home_new_user_gift', 'profile_center'],
      sort_order: -70,
    },
    {
      type: 'points_bonus',
      title: '本地预览积分加倍',
      subtitle: '下单积分翻倍',
      cover_image: imageUrl(),
      start_at: datetime(-1),
      end_at: datetime(45, '23:59:59'),
      description: '用于测试积分活动提示。',
      status: 'active',
      activity_config: { multiplier_percent: 200, min_order_amount: 50, max_bonus_points: 500, bonus_kind: 'normal' },
      scope_type: 'all',
      display_positions: ['checkout_notice', 'profile_center', 'promotion_banner'],
      sort_order: -60,
    },
  ];

  if (secondVariant) {
    activities[0].items.push({
      product_id: cable.id,
      variant_id: secondVariant.id,
      activity_price: 39,
      activity_stock: 40,
      limit_per_user: 3,
      sort_order: 2,
    });
  }

  for (const payload of activities) {
    await ensureActivity(payload);
  }
}

async function seedSettingsContentShipping() {
  await ensureSensitiveAction('high_risk_config');
  const settings = await api('GET', '/admin/settings');
  await api('PUT', '/admin/settings', {
    version: settings?.version,
    siteName: '本地预览商城',
    siteSubtitle: '本地模拟数据环境',
    supportEmail: 'support@example.test',
    supportPhone: '+60 12-345 6789',
    companyAddress: 'Level 10, Menara Example, Jalan Ampang, Kuala Lumpur, Malaysia',
    localPreviewNote: `模拟数据更新时间：${RUN_LABEL}`,
  });

  const content = await ensureContentPage({
    slug: 'local-preview-guide',
    title: '本地预览内容说明',
    content: `
      <h2>这是什么页面？</h2>
      <p>这是通过管理后台接口生成的本地模拟内容，用来帮助开发时查看完整页面布局。</p>
      <h2>会不会发布到线上？</h2>
      <p>不会。它只写入当前连接的本地数据库。只要部署流程不导出本地数据库，这些模拟数据不会跟着代码发布。</p>
      <h2>地址示例</h2>
      <p>Malaysia address example: Level 10, Menara Example, Jalan Ampang, Kuala Lumpur, Malaysia.</p>
      <h2>适合测试什么？</h2>
      <p>首页 Banner、分类导航、商品列表、商品详情、优惠券、活动、内容页、会员和积分展示。</p>
    `,
    publish_status: 'published',
  });
  state.contentPages[content.slug] = content;

  await ensureContentPage({
    slug: 'local-malaysia-shipping',
    title: '本地预览：马来西亚配送说明',
    content: `
      <h2>配送范围</h2>
      <p>当前模拟支持 Kuala Lumpur、Selangor、Penang、Johor Bahru。</p>
      <h2>说明</h2>
      <p>这是本地测试内容，方便检查中文说明和英文地址混排。</p>
    `,
    publish_status: 'published',
  });

  await ensureShippingTemplate({
    name: '本地预览马来西亚配送',
    regions: 'Kuala Lumpur, Selangor, Penang, Johor Bahru',
    baseFee: 8,
    freeAbove: 199,
    extraPerKg: 2,
    enabled: true,
    isDefault: true,
  });

  const shippingSettings = await api('GET', '/admin/shipping/settings');
  await api('PUT', '/admin/shipping/settings', {
    version: shippingSettings?.version,
    freeShippingThreshold: 199,
    defaultShippingFee: 8,
    shippingNotice: '本地预览：满 RM199 免运费，覆盖 Kuala Lumpur、Selangor、Penang。',
  });
}

async function seedMemberPointsNotificationsInventory() {
  await ensureMemberLevel({
    name: '本地体验会员',
    description: '用于本地测试会员等级展示。',
    min_spent: 0,
    min_orders: 0,
    discount_rate: 1,
    points_multiplier: 1,
    free_shipping_enabled: false,
    sort_order: 1,
    enabled: true,
    is_default: true,
  });
  await ensureMemberLevel({
    name: '本地黄金会员',
    description: '用于本地测试会员权益、折扣和积分倍率。',
    min_spent: 1000,
    min_orders: 5,
    discount_rate: 0.92,
    points_multiplier: 1.5,
    free_shipping_enabled: true,
    sort_order: 2,
    enabled: true,
    is_default: false,
  });

  await ensureSensitiveAction('high_risk_config');
  await api('PUT', '/admin/points/settings', {
    display_enabled: true,
    earn_enabled: true,
    redeem_enabled: true,
    point_value_myr: 0.01,
    min_redeem_points: 100,
    redeem_step: 10,
    max_redeem_percent: 30,
    min_order_amount: 30,
    allow_with_coupon: true,
    settle_timing: 'order_completed',
    expire_enabled: true,
    expire_days: 365,
  });

  const band = state.products['小米智能手环 9 本地预览套装'];
  if (band?.id) {
    await ensurePointsProductRule({
      name: '本地预览商品积分加倍',
      scope_type: 'product',
      scope_id: band.id,
      priority: 10,
      earn_enabled: true,
      earn_mode: 'multiplier',
      multiplier_percent: 200,
      redeem_enabled: true,
      max_redeem_percent: 20,
      enabled: true,
    });

    await ensureGiftItem({
      product_id: band.id,
      variant_id: band.variants?.[0]?.id || null,
      title: '本地预览积分兑换礼品',
      image: imageUrl(),
      required_points: 800,
      cash_amount: 9.9,
      stock_limit: 50,
      limit_per_user: 1,
      start_at: datetime(-1),
      end_at: datetime(120, '23:59:59'),
      enabled: true,
      sort_order: -10,
    });
  }

  await api('POST', '/admin/notifications/drafts', {
    type: 'promotion',
    title: '本地预览通知草稿',
    content: '这是一条通过后台接口保存的通知草稿，用于测试后台通知编辑和列表展示。',
    audience_type: 'all',
    link_url: '/content/local-preview-guide',
  });
  await api('POST', '/admin/notifications', {
    type: 'promotion',
    title: '本地预览活动已上线',
    content: '本地模拟商品、优惠券和活动已经生成，可以开始测试页面布局。',
    audience_type: 'all',
    link_url: '/products',
  });

  const skuPage = await api('GET', '/admin/inventory/skus?page=1&pageSize=100&keyword=LOCAL-BAND9');
  const sku = (skuPage.list || []).find((item) => item.sku_code === 'LOCAL-BAND9-BLK') || skuPage.list?.[0];
  if (sku?.variant_id) {
    await api('POST', `/admin/inventory/skus/${sku.variant_id}/adjust`, {
      change_type: 'adjust',
      quantity: 120,
      reason: '本地模拟库存盘点',
      remark: '用于本地测试库存预警、库存列表和操作日志。',
      cost_price: 110,
    });
  }

  const parent = state.products['企业采购欢迎包']?.variants?.[0];
  const child = state.products['Type-C 快充线材三件套']?.variants?.[0];
  if (parent?.id && child?.id && parent.id !== child.id) {
    await ensureSensitiveAction('bulk_inventory');
    const rules = await api('GET', '/admin/inventory/pack-rules?page=1&pageSize=100');
    const exists = (rules.list || []).find((item) => item.parent_variant_id === parent.id && item.child_variant_id === child.id);
    if (!exists) {
      await api('POST', '/admin/inventory/pack-rules', {
        parent_variant_id: parent.id,
        child_variant_id: child.id,
        parent_qty: 1,
        child_qty: 3,
        auto_unpack_enabled: false,
        manual_unpack_enabled: true,
        manual_assemble_enabled: true,
        enabled: true,
        remark: '本地模拟组合拆包规则。',
      });
    }
  }
}

async function seedReviewsIfAny() {
  const page = await api('GET', '/admin/reviews?page=1&pageSize=20');
  const first = page.list?.[0];
  if (!first?.id) return { skipped: true, reason: '本地暂无评价记录，后台评价只能审核/回复已有评价。' };
  await api('PUT', `/admin/reviews/${first.id}/approve`, {});
  await api('PUT', `/admin/reviews/${first.id}/reply`, {
    reply: '感谢反馈，这是本地模拟后台回复，用于测试评价管理展示。',
  });
  return { id: first.id };
}

async function runPublicChecks() {
  const checks = [
    ['前台商品列表', '/products?page=1&pageSize=6&keyword=本地预览'],
    ['前台 Banner', '/banners'],
    ['前台分类', '/categories'],
    ['前台首页运营', '/content/home-ops'],
    ['前台内容页', '/content/local-preview-guide'],
  ];
  for (const [name, url] of checks) {
    try {
      const data = await publicApi(url);
      const count = Array.isArray(data) ? data.length : (data?.list?.length ?? (data ? 1 : 0));
      state.report.publicChecks.push({ name, ok: true, count });
      console.log(`  OK ${name}：可读取，数量/结果 ${count}`);
    } catch (err) {
      state.report.publicChecks.push({ name, ok: false, message: err.message });
      console.warn(`  FAIL ${name}: ${err.message}`);
    }
  }
}

async function main() {
  assertLocalUrl(API_BASE, 'ADMIN_SEED_API_BASE');
  assertLocalUrl(PUBLIC_API_BASE, 'ADMIN_SEED_PUBLIC_API_BASE');
  requireAdminPassword();

  console.log('开始通过管理后台接口生成本地模拟数据...');
  console.log(`API：${API_BASE}`);

  await step('后台登录和 MFA 校验', async () => loginAdmin());
  if (!state.token) throw new Error('没有拿到后台 token，停止写入模拟数据。');

  await step('后台文件上传', uploadPreviewImage, { optional: true });
  await step('分类和商品标签', seedCategoriesAndTags);
  await step('商品', seedProducts);
  await step('Banner 和首页运营', seedBannersAndHomeOps);
  await step('优惠券和营销活动', seedCouponsAndActivities);
  await step('站点设置、内容页和配送', seedSettingsContentShipping, { optional: true });
  await step('会员、积分、通知和库存', seedMemberPointsNotificationsInventory, { optional: true });
  await step('评价审核/回复（有评价才处理）', seedReviewsIfAny, { optional: true });

  console.log('开始检查前台接口是否能读到这些后台内容...');
  await runPublicChecks();

  console.log('\n本地模拟数据生成报告：');
  console.log(JSON.stringify(state.report, null, 2));

  if (state.report.requiredFailed.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

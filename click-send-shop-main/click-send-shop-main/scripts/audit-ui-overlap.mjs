/**
 * UI overlap audit (extended).
 * Usage: node scripts/audit-ui-overlap.mjs
 * Env: BASE_URL, API_BASE_URL, VIEWPORTS (e.g. "390x844,375x667"), COUPON_STYLES_ALL=1,
 *      SKIP_AUTH=1, SKIP_ADMIN=1, AUDIT_READ_ONLY=1,
 *      AUDIT_USER_PHONE, AUDIT_USER_PASSWORD, AUDIT_USER_COUNTRY_CODE
 */
import { chromium } from "@playwright/test";

let BASE = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, "") : "";
let API = "";
const FULL_AUDIT = process.argv.includes("--full") || process.env.AUDIT_FULL === "1";
const READ_ONLY_AUDIT = process.argv.includes("--read-only") || process.env.AUDIT_READ_ONLY === "1";
const NAV_TIMEOUT_MS = Number(process.env.AUDIT_NAV_TIMEOUT_MS || (FULL_AUDIT ? 25000 : 15000));
const STABLE_WAIT_MS = Number(process.env.AUDIT_STABLE_WAIT_MS || (FULL_AUDIT ? 700 : 250));
const SCROLL_WAIT_MS = Number(process.env.AUDIT_SCROLL_WAIT_MS || (FULL_AUDIT ? 400 : 150));
const VIEWPORTS = (process.env.VIEWPORTS || "390x844,375x667,1280x800")
  .split(",")
  .map((s) => {
    const [w, h] = s.trim().split("x").map(Number);
    return { width: w, height: h, label: s.trim() };
  });
const COUPON_STYLES =
  FULL_AUDIT || process.env.COUPON_STYLES_ALL === "1"
    ? ["ticket", "premium", "deal", "minimal"]
    : ["ticket"];
const ADMIN_PHONE = process.env.ADMIN_PHONE || "18800000001";
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();
const ADMIN_ACCESS_TOKEN = String(process.env.ADMIN_ACCESS_TOKEN || "").trim();
const ADMIN_REFRESH_TOKEN = String(process.env.ADMIN_REFRESH_TOKEN || "").trim();
const ADMIN_CSRF_TOKEN = String(process.env.ADMIN_CSRF_TOKEN || "").trim();
const REQUIRE_ADMIN_SCAN = process.env.REQUIRE_ADMIN_SCAN === "1";
const SKIP_AUTH = READ_ONLY_AUDIT || process.env.SKIP_AUTH === "1";
const SKIP_ADMIN = READ_ONLY_AUDIT || process.env.SKIP_ADMIN === "1";
const AUDIT_USER_PHONE = String(process.env.AUDIT_USER_PHONE || process.env.PUBLIC_TEST_USER_PHONE || "").trim();
const AUDIT_USER_PASSWORD = String(process.env.AUDIT_USER_PASSWORD || process.env.PUBLIC_TEST_USER_PASSWORD || "").trim();
const AUDIT_USER_COUNTRY_CODE = String(process.env.AUDIT_USER_COUNTRY_CODE || "+60").trim();

function assertAdminPassword() {
  if (!ADMIN_PASSWORD && !ADMIN_ACCESS_TOKEN) throw new Error("Missing ADMIN_PASSWORD env; do not use hardcoded admin credentials.");
}

function parseAdminPermissionsEnv() {
  const raw = String(process.env.ADMIN_PERMISSIONS || "").trim();
  if (!raw) return [];
  if (raw.startsWith("[")) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return [];
    }
  }
  return raw.split(",").map((item) => item.trim()).filter(Boolean);
}

function adminSessionFromEnv() {
  if (!ADMIN_ACCESS_TOKEN) return null;
  return {
    access: ADMIN_ACCESS_TOKEN,
    refresh: ADMIN_REFRESH_TOKEN,
    cookies: [],
    csrf: ADMIN_CSRF_TOKEN,
    permissions: parseAdminPermissionsEnv(),
    isSuperAdmin: process.env.ADMIN_IS_SUPER_ADMIN === "1",
  };
}

const PUBLIC_ROUTES = [
  { path: "/", name: "首页" },
  { path: "/categories", name: "分类" },
  { path: "/new-arrivals", name: "新品" },
  { path: "/promotions", name: "活动列表" },
  { path: "/cart", name: "购物车" },
  { path: "/profile", name: "我的" },
  { path: "/coupons", name: "优惠券", needsAuth: true },
  { path: "/search", name: "搜索" },
  { path: "/login", name: "登录" },
  { path: "/register", name: "注册" },
  { path: "/forgot-password", name: "找回密码" },
  { path: "/login/bind-phone", name: "绑定手机号" },
  { path: "/help", name: "帮助" },
  { path: "/about", name: "关于" },
  { path: "/delivery", name: "配送说明" },
  { path: "/feature-status", name: "功能状态" },
  { path: "/feedback", name: "意见反馈" },
  { path: "/support-download", name: "客服下载" },
  { path: "/install", name: "安装应用" },
  { path: "/content/contact-us", name: "CMS 内容页" },
  { path: "/payment/result?order_no=SMOKE", name: "支付结果" },
  { path: "/tiktok", name: "大马通独立页" },
  { path: "/favorites", name: "收藏" },
  { path: "/history", name: "浏览记录" },
  { path: "/orders", name: "订单列表", needsAuth: true },
  { path: "/settings", name: "设置", needsAuth: true },
  { path: "/member/benefits", name: "会员权益", needsAuth: true },
  { path: "/points", name: "积分", needsAuth: true },
  { path: "/points/gifts", name: "积分礼品", needsAuth: true },
  { path: "/rewards", name: "返现", needsAuth: true },
  { path: "/wallet", name: "钱包", needsAuth: true },
  { path: "/invite", name: "邀请", needsAuth: true },
  { path: "/address", name: "地址", needsAuth: true },
  { path: "/notifications", name: "通知", needsAuth: true },
  { path: "/returns", name: "售后", needsAuth: true },
  { path: "/reviews/pending", name: "待评价", needsAuth: true },
  { path: "/checkout", name: "结算", needsAuth: true, needsCart: true },
];

const ADMIN_ROUTES = [
  { path: "/admin/login", name: "后台登录" },
  { path: "/admin", name: "后台仪表盘", needsAdmin: true },
  { path: "/admin/orders", name: "后台订单", needsAdmin: true },
  { path: "/admin/products", name: "后台商品", needsAdmin: true },
  { path: "/admin/marketing/coupons", name: "后台优惠券", needsAdmin: true },
  { path: "/admin/settings/theme", name: "主题工作室", needsAdmin: true },
  { path: "/admin/home-ops", name: "首页运营", needsAdmin: true },
];

const ALL_SCROLL_MODES = [
  { id: "top", label: "顶部" },
  { id: "middle", label: "中部" },
  { id: "bottom", label: "底部" },
];

const SCROLL_MODES = (process.env.SCROLL_MODES || (FULL_AUDIT ? "top,middle,bottom" : "top,bottom"))
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean)
  .map((id) => ALL_SCROLL_MODES.find((item) => item.id === id) || { id, label: id });

async function pickBaseUrl() {
  if (BASE) return BASE;
  for (const candidate of [
    "http://127.0.0.1:5177",
    "http://127.0.0.1:8080",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
  ]) {
    try {
      const res = await fetch(`${candidate}/admin/login`, {
        redirect: "manual",
        signal: AbortSignal.timeout(1200),
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.includes('id="root"') || html.includes("id='root'")) return candidate;
    } catch {
      /* try next candidate */
    }
  }
  return "http://localhost:8080";
}

function resolveApiBase() {
  return process.env.API_BASE_URL
    ? `${process.env.API_BASE_URL.replace(/\/$/, "")}/api`
    : `${BASE.replace(/\/$/, "")}/api`;
}

async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 0) {
    throw new Error(`${options.method || "GET"} ${url} -> ${body.message || res.status}`);
  }
  return body.data;
}

async function isApiAvailable() {
  try {
    const res = await fetch(`${API}/health/live`);
    const body = await res.json().catch(() => ({}));
    return res.ok && body.code === 0;
  } catch {
    return false;
  }
}

/** Malaysia local mobile (9–10 digits, e.g. 0123456789) for +60 registration. */
function randomPhone() {
  const tail = `${Date.now()}${Math.floor(Math.random() * 1000)}`.replace(/\D/g, "").slice(-8);
  return `01${tail}`.slice(0, 10);
}

async function registerUser() {
  const phone = randomPhone();
  const password = "OverlapAudit1A";
  const countryCode = "+60";
  await jfetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, countryCode, password, nickname: `audit-${phone.slice(-4)}` }),
  });
  const login = await jfetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, countryCode, password }),
  });
  const token = login.token?.accessToken || login.token;
  return { token, password, phone, source: "register" };
}

async function loginAuditUserFromEnv() {
  if (!AUDIT_USER_PHONE && !AUDIT_USER_PASSWORD) return null;
  if (!AUDIT_USER_PHONE || !AUDIT_USER_PASSWORD) {
    throw new Error("AUDIT_USER_PHONE and AUDIT_USER_PASSWORD must be provided together.");
  }
  const login = await jfetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      phone: AUDIT_USER_PHONE,
      countryCode: AUDIT_USER_COUNTRY_CODE,
      password: AUDIT_USER_PASSWORD,
    }),
  });
  const token = login.token?.accessToken || login.token;
  return {
    token,
    phone: AUDIT_USER_PHONE,
    password: AUDIT_USER_PASSWORD,
    source: "env",
  };
}

async function resolveAuditUser() {
  return (await loginAuditUserFromEnv()) || registerUser();
}

function splitSetCookieHeader(value) {
  if (!value) return [];
  const parts = [];
  let start = 0;
  for (let i = 0; i < value.length; i += 1) {
    if (value[i] !== ",") continue;
    const rest = value.slice(i + 1);
    if (/^\s*[^=;,\s]+=/.test(rest)) {
      parts.push(value.slice(start, i).trim());
      start = i + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts.filter(Boolean);
}

function parseSetCookieHeader(header, targetOrigin) {
  const url = new URL(targetOrigin);
  const segments = header.split(";").map((part) => part.trim()).filter(Boolean);
  const [nameValue, ...attrs] = segments;
  const eqIndex = nameValue.indexOf("=");
  if (eqIndex <= 0) return null;

  const cookie = {
    name: nameValue.slice(0, eqIndex),
    value: nameValue.slice(eqIndex + 1),
    secure: url.protocol === "https:",
    httpOnly: false,
    sameSite: "Lax",
  };
  let cookiePath = "/";
  let cookieDomain = "";

  for (const attr of attrs) {
    const [rawKey, ...rawValueParts] = attr.split("=");
    const key = rawKey.toLowerCase();
    const value = rawValueParts.join("=");
    if (key === "path" && value) cookiePath = value;
    else if (key === "domain" && value) cookieDomain = value;
    else if (key === "secure") cookie.secure = true;
    else if (key === "httponly") cookie.httpOnly = true;
    else if (key === "samesite" && /^(Strict|Lax|None)$/i.test(value)) {
      cookie.sameSite = value[0].toUpperCase() + value.slice(1).toLowerCase();
    } else if (key === "max-age" && value) {
      const seconds = Number(value);
      if (Number.isFinite(seconds)) cookie.expires = Math.floor(Date.now() / 1000) + seconds;
    } else if (key === "expires" && value) {
      const time = Date.parse(value);
      if (Number.isFinite(time)) cookie.expires = Math.floor(time / 1000);
    }
  }

  if (cookieDomain) {
    cookie.domain = cookieDomain;
    cookie.path = cookiePath;
  } else {
    cookie.url = url.origin;
  }

  return cookie;
}

function readResponseCookies(res, targetOrigin) {
  const headers = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : splitSetCookieHeader(res.headers.get("set-cookie") || "");
  return headers.map((header) => parseSetCookieHeader(header, targetOrigin)).filter(Boolean);
}

async function adminLogin() {
  assertAdminPassword();
  const envSession = adminSessionFromEnv();
  if (envSession) return envSession;
  const res = await fetch(`${API}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: ADMIN_PHONE, username: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 0) {
    throw new Error(`POST ${API}/admin/auth/login -> ${body.message || res.status}`);
  }
  const data = body.data || {};
  return {
    access: data.token?.accessToken || data.accessToken || "",
    refresh: data.token?.refreshToken || data.refreshToken || "",
    cookies: readResponseCookies(res, BASE),
    csrf: data.csrfToken || "",
    permissions: Array.isArray(data.permissions) ? data.permissions : [],
    isSuperAdmin: Boolean(data.isSuperAdmin),
  };
}

async function authPost(pathname, token, payload) {
  return jfetch(`${API}${pathname}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function seedCart(token) {
  const products = await jfetch(`${API}/products?page=1&pageSize=30`);
  const list = products?.list || [];
  for (const p of list) {
    if (!p?.id) continue;
    try {
      await authPost("/cart", token, { productId: p.id, qty: 1 });
      return true;
    } catch {
      /* 尝试下一个有库存商品 */
    }
  }
  return false;
}

async function loginFrontend(page, phone, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
  await waitStable(page);
  const phoneInput = page.locator("#auth-phone");
  if ((await phoneInput.count()) === 0) return false;
  await phoneInput.fill(phone);
  const passwordInput = page.locator("#auth-password");
  if ((await passwordInput.count()) === 0) return false;
  await passwordInput.fill(password);
  const loginBtn = page.locator("form .auth-login-submit, form button[type='submit']");
  if ((await loginBtn.count()) === 0) return false;
  await loginBtn.first().click();
  await page.waitForTimeout(FULL_AUDIT ? 2000 : 900);
  if (!page.url().includes("/login")) return true;
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await waitStable(page);
  return !page.url().includes("/login");
}

async function loginAdminUi(page) {
  assertAdminPassword();
  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await waitStable(page);
  const accountInput = page
    .locator("#admin-login-account, input[name='account'], input[autocomplete='username']")
    .or(page.getByPlaceholder(/账号|手机号|手机|Account|Phone|Username/i))
    .first();
  const passwordInput = page
    .locator("#admin-login-password, input[type='password'], input[autocomplete='current-password']")
    .or(page.getByPlaceholder(/密码|Password/i))
    .first();
  if ((await accountInput.count()) === 0 || (await passwordInput.count()) === 0) return false;
  await accountInput.fill(ADMIN_PHONE);
  await passwordInput.fill(ADMIN_PASSWORD);
  const loginButton = page.locator("form button[type='submit']").or(page.getByRole("button", { name: /登录|Login/i })).first();
  if ((await loginButton.count()) === 0) return false;
  await loginButton.click();
  await page.waitForURL((url) => url.pathname.startsWith("/admin") && !url.pathname.includes("/admin/login"), {
    timeout: FULL_AUDIT ? 6000 : 3500,
  }).catch(() => undefined);
  await page.waitForTimeout(FULL_AUDIT ? 1500 : 800);
  return page.url().includes("/admin") && !page.url().includes("/admin/login");
}

function bootstrapAdminSession(session) {
  localStorage.setItem("admin_authenticated", "1");
  localStorage.setItem(
    "admin-permissions",
    JSON.stringify({
      state: {
        permissions: Array.isArray(session?.permissions) ? session.permissions : [],
        isSuperAdmin: Boolean(session?.isSuperAdmin),
      },
      version: 0,
    }),
  );
}

async function applyAdminSessionToContext(context, session) {
  if (!session) return;
  const syntheticCookies = [];
  const baseOrigin = new URL(BASE).origin;
  if (session.access) {
    syntheticCookies.push({
      name: "admin_access_token",
      value: session.access,
      url: baseOrigin,
      httpOnly: true,
      secure: baseOrigin.startsWith("https:"),
      sameSite: "Strict",
    });
  }
  if (session.refresh) {
    syntheticCookies.push({
      name: "admin_refresh_token",
      value: session.refresh,
      url: baseOrigin,
      httpOnly: true,
      secure: baseOrigin.startsWith("https:"),
      sameSite: "Strict",
    });
  }
  const cookies = [...(session.cookies || []), ...syntheticCookies];
  if (cookies.length) {
    await context.addCookies(cookies);
  }
  await context.addInitScript(bootstrapAdminSession, session);
  if (session.access) {
    await context.route("**/api/admin/**", (route) => {
      const method = route.request().method().toUpperCase();
      if (READ_ONLY_AUDIT && method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
        return route.abort("blockedbyclient");
      }
      const headers = { ...route.request().headers() };
      const url = new URL(route.request().url());
      if (session.refresh && url.pathname.endsWith("/api/admin/auth/refresh")) {
        const refreshCookie = `admin_refresh_token=${encodeURIComponent(session.refresh)}`;
        headers.cookie = headers.cookie ? `${headers.cookie}; ${refreshCookie}` : refreshCookie;
      }
      return route.continue({
        headers: {
          ...headers,
          authorization: `Bearer ${session.access}`,
        },
      });
    });
  }
}

async function verifyAdminSession(page) {
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  await waitStable(page);
  if (page.url().includes("/admin/login")) return false;
  return page.evaluate(() => {
    const shell = document.querySelector("[data-admin-shell], .admin-chrome");
    const loginInput = document.querySelector("#admin-login-account, #admin-login-password");
    const text = document.body.innerText.replace(/\s+/g, " ").trim();
    return Boolean(shell) && !loginInput && !/页面不存在|Page not found/i.test(text);
  });
}

/** @param {import('@playwright/test').Page} page */
async function detectOverlaps(page) {
  return page.evaluate(() => {
    const MIN_OVERLAP_PX = 120;
    const MIN_RATIO = 0.28;
    const SKIP_TAGS = new Set(["HTML", "BODY", "MAIN", "SECTION", "DIV", "UL", "OL", "LI", "NAV", "HEADER", "FOOTER", "ARTICLE", "ASIDE"]);

    function visible(el) {
      const s = getComputedStyle(el);
      if (s.display === "none" || s.visibility === "hidden" || Number(s.opacity) === 0) return false;
      const r = el.getBoundingClientRect();
      return r.width >= 4 && r.height >= 4 && r.bottom > 0 && r.right > 0 && r.top < innerHeight && r.left < innerWidth;
    }

    function hasText(el) {
      const t = (el.textContent || "").replace(/\s+/g, " ").trim();
      return t.length > 0 && t.length < 200;
    }

    function inFixedChrome(el) {
      let n = el;
      while (n && n !== document.body) {
        const s = getComputedStyle(n);
        if (s.position === "fixed" || s.position === "sticky") return true;
        if (n.classList?.contains("z-bottom-nav") || n.classList?.contains("z-checkout-bar")) return true;
        n = n.parentElement;
      }
      return false;
    }

    function inModal(el) {
      return Boolean(el.closest('[role="dialog"], [data-radix-dialog-content], .z-modal, .z-drawer'));
    }

    function isInputAdornment(a, b) {
      const tags = [a.tagName, b.tagName];
      if (!tags.includes("INPUT")) return false;
      const input = a.tagName === "INPUT" ? a : b;
      const other = a.tagName === "INPUT" ? b : a;
      return other.tagName === "BUTTON" && input.parentElement?.contains(other);
    }

    function meaningful(el) {
      if (!visible(el)) return false;
      if (inFixedChrome(el)) return false;
      if (el.getAttribute("aria-hidden") === "true" || el.closest('[aria-hidden="true"]')) return false;
      const tag = el.tagName;
      if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "LABEL") return true;
      if (el.getAttribute("role") === "button") return true;
      const style = getComputedStyle(el);
      if (style.pointerEvents === "none" && !hasText(el)) return false;
      if (el.hasAttribute("data-coupon-card-layout")) return true;
      if (el.closest("[data-coupon-card-layout]")) return true;
      if (SKIP_TAGS.has(tag)) return false;
      return hasText(el);
    }

    function ancestor(a, b) {
      return a === b || a.contains(b) || b.contains(a);
    }

    function overlapArea(ra, rb) {
      const w = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
      const h = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
      return w * h;
    }

    function descriptor(el) {
      const tag = el.tagName.toLowerCase();
      const cls = (el.className && typeof el.className === "string" ? el.className : "")
        .split(/\s+/)
        .filter((c) => c && !c.startsWith("["))
        .slice(0, 3)
        .join(".");
      const text = (el.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
      const layout = el.getAttribute("data-coupon-card-layout");
      const modal = inModal(el) ? "[modal]" : "";
      return `<${tag}${cls ? `.${cls}` : ""}${layout ? `[layout=${layout}]` : ""}${modal}> "${text}"`;
    }

    const all = Array.from(document.querySelectorAll("*")).filter(meaningful);
    const hits = [];

    for (let i = 0; i < all.length; i += 1) {
      for (let j = i + 1; j < all.length; j += 1) {
        const a = all[i];
        const b = all[j];
        if (ancestor(a, b)) continue;
        if (isInputAdornment(a, b)) continue;
        const sa = getComputedStyle(a);
        const sb = getComputedStyle(b);
        if (sa.pointerEvents === "none" || sb.pointerEvents === "none") continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        const area = overlapArea(ra, rb);
        if (area < MIN_OVERLAP_PX) continue;
        const smaller = Math.min(ra.width * ra.height, rb.width * rb.height);
        if (area / smaller < MIN_RATIO) continue;
        hits.push({ area: Math.round(area), a: descriptor(a), b: descriptor(b) });
      }
    }

    hits.sort((x, y) => y.area - x.area);
    const deduped = [];
    const seen = new Set();
    for (const h of hits) {
      const key = [h.a, h.b].sort().join("||");
      if (seen.has(key)) continue;
      seen.add(key);
      deduped.push(h);
      if (deduped.length >= 8) break;
    }
    return deduped;
  });
}

/** @param {import('@playwright/test').Page} page */
async function detectCouponCardOverlaps(page) {
  return page.evaluate(() => {
    const issues = [];
    function isDecorative(el) {
      if (el.getAttribute("aria-hidden") === "true" || el.closest('[aria-hidden="true"]')) return true;
      const style = getComputedStyle(el);
      if (style.pointerEvents === "none") return true;
      return el.tagName !== "BUTTON" && !(el.textContent || "").trim();
    }
    for (const card of document.querySelectorAll("[data-coupon-card-layout]")) {
      const items = Array.from(card.querySelectorAll("p, span, button")).filter((el) => {
        if (isDecorative(el)) return false;
        const r = el.getBoundingClientRect();
        return r.width > 2 && r.height > 2;
      });
      for (let i = 0; i < items.length; i += 1) {
        for (let j = i + 1; j < items.length; j += 1) {
          const a = items[i];
          const b = items[j];
          if (a.contains(b) || b.contains(a)) continue;
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          const w = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
          const h = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
          const area = w * h;
          if (area < 40) continue;
          issues.push({
            layout: card.getAttribute("data-coupon-card-layout"),
            area: Math.round(area),
            texts: [(a.textContent || "").trim().slice(0, 20), (b.textContent || "").trim().slice(0, 20)],
          });
        }
      }
    }
    return issues;
  });
}

/** CouponPicker 选中勾与券卡操作区 */
async function detectPickerBadgeOverlaps(page) {
  return page.evaluate(() => {
    const issues = [];
    const badges = document.querySelectorAll(".pointer-events-none.absolute.right-3.top-3");
    for (const badge of badges) {
      const card = badge.closest(".relative")?.querySelector("[data-coupon-card-layout]");
      if (!card) continue;
      const btn = card.querySelector("button");
      if (!btn) continue;
      const ra = badge.getBoundingClientRect();
      const rb = btn.getBoundingClientRect();
      const w = Math.max(0, Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left));
      const h = Math.max(0, Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top));
      const area = w * h;
      if (area > 20) {
        issues.push({ area: Math.round(area), badgeText: (badge.textContent || "").trim(), btnText: (btn.textContent || "").trim().slice(0, 20) });
      }
    }
    return issues;
  });
}

async function waitStable(page) {
  await page.waitForLoadState("domcontentloaded", { timeout: NAV_TIMEOUT_MS }).catch(() => {});
  await page.waitForTimeout(STABLE_WAIT_MS);
}

async function configureReadOnlyContext(context) {
  if (!READ_ONLY_AUDIT) return;
  await context.route("**/api/**", (route) => {
    const method = route.request().method().toUpperCase();
    if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
      return route.abort("blockedbyclient");
    }
    return route.continue();
  });
}

async function scrollPage(page, mode) {
  await page.evaluate((scrollId) => {
    const max = Math.max(document.documentElement.scrollHeight - innerHeight, 0);
    if (scrollId === "top") window.scrollTo(0, 0);
    else if (scrollId === "bottom") window.scrollTo(0, max);
    else window.scrollTo(0, Math.floor(max / 2));
  }, mode);
  await page.waitForTimeout(SCROLL_WAIT_MS);
}

async function scanPage(page, meta) {
  const overlaps = await detectOverlaps(page);
  const couponOverlaps = await detectCouponCardOverlaps(page);
  const pickerOverlaps = await detectPickerBadgeOverlaps(page);
  if (overlaps.length === 0 && couponOverlaps.length === 0 && pickerOverlaps.length === 0) return null;
  return { ...meta, overlaps, couponOverlaps, pickerOverlaps };
}

async function tryProductDetail(page, metaBase) {
  const issues = [];
  const link = page.locator('a[href^="/product/"]').first();
  if ((await link.count()) === 0) return issues;
  const href = await link.getAttribute("href");
  if (!href) return issues;

  for (const scroll of SCROLL_MODES) {
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await waitStable(page);
    await scrollPage(page, scroll.id);
    const hit = await scanPage(page, { ...metaBase, route: "商品详情", path: href, scroll: scroll.label });
    if (hit) issues.push(hit);
  }
  return issues;
}

async function tryPromotionDetail(page, metaBase) {
  const issues = [];
  await page.goto(`${BASE}/promotions`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  await waitStable(page);
  const link = page.locator('a[href^="/promotions/"]').first();
  if ((await link.count()) === 0) return issues;
  const href = await link.getAttribute("href");
  if (!href || href === "/promotions") return issues;

  for (const scroll of SCROLL_MODES) {
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    await waitStable(page);
    await scrollPage(page, scroll.id);
    const hit = await scanPage(page, { ...metaBase, route: "活动详情", path: href, scroll: scroll.label });
    if (hit) issues.push(hit);
  }
  return issues;
}

async function tryCheckoutCouponSheet(page, metaBase) {
  const issues = [];
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  await waitStable(page);
  if (page.url().includes("/login")) return issues;

  const trigger = page.getByRole("button", { name: /选择优惠券|优惠券|可用优惠|暂无可用|张可用/ }).first();
  if ((await trigger.count()) === 0) return issues;
  if (!(await trigger.isVisible().catch(() => false))) return issues;
  await trigger.click({ timeout: 5000 }).catch(() => null);
  await page.waitForTimeout(FULL_AUDIT ? 600 : 250);

  const hit = await scanPage(page, { ...metaBase, route: "结算-选券弹层", path: "/checkout", scroll: "弹层打开" });
  if (hit) issues.push(hit);
  return issues;
}

function pushIssue(report, issue) {
  if (issue) report.push(issue);
}

async function main() {
  BASE = await pickBaseUrl();
  API = resolveApiBase();
  const report = [];
  const setupSkips = [];
  const browser = await chromium.launch({ headless: true });
  const apiAvailable = await isApiAvailable();

  let userCreds = null;
  let cartReady = false;
  if (!apiAvailable) {
    setupSkips.push({
      phase: "setup",
      reason: "api_unavailable",
      message: `API health check failed at ${API}/health/live; auth/admin seeded scans skipped.`,
    });
  }

  if (!SKIP_AUTH && apiAvailable) {
    try {
      const user = await resolveAuditUser();
      userCreds = { phone: user.phone, password: user.password, token: user.token };
      try {
        cartReady = await seedCart(user.token);
        if (!cartReady) {
          report.push({ phase: "setup", error: "购物车种子：未找到可加入购物车的有库存商品" });
        }
      } catch (e) {
        report.push({ phase: "setup", error: `购物车种子: ${e.message}` });
      }
    } catch (e) {
      const authSetup = AUDIT_USER_PHONE || AUDIT_USER_PASSWORD ? "前台测试用户登录" : "用户注册";
      report.push({ phase: "setup", error: `${authSetup}: ${e.message}` });
    }
  }

  let adminApiOk = false;
  let adminSession = null;
  let adminUiAuthenticated = false;
  let adminAuthenticatedScan = false;
  if (!SKIP_ADMIN && apiAvailable) {
    try {
      adminSession = await adminLogin();
      adminApiOk = true;
    } catch (e) {
      report.push({ phase: "setup", error: `后台 API 登录: ${e.message}` });
    }
  }

  for (const vp of VIEWPORTS) {
    const isMobile = vp.width < 768;
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      locale: "zh-CN",
    });
    await configureReadOnlyContext(context);
    await applyAdminSessionToContext(context, adminSession);

    const page = await context.newPage();
    let userLoggedIn = false;
    if (userCreds) {
      userLoggedIn = await loginFrontend(page, userCreds.phone, userCreds.password);
      if (!userLoggedIn) {
        report.push({ phase: "setup", error: `前台 UI 登录失败 (${vp.label})` });
      }
    }

    let adminLoggedIn = false;
    if (adminSession) {
      adminLoggedIn = await verifyAdminSession(page);
      if (!adminLoggedIn) {
        adminLoggedIn = await loginAdminUi(page);
        adminUiAuthenticated = adminUiAuthenticated || adminLoggedIn;
      }
      adminAuthenticatedScan = adminAuthenticatedScan || adminLoggedIn;
      adminUiAuthenticated = adminUiAuthenticated || adminLoggedIn;
      if (!adminLoggedIn) {
        report.push({ phase: "setup", error: `后台鉴权页面扫描未建立会话 (${vp.label})` });
      }
    }

    for (const style of COUPON_STYLES) {
      await page.addInitScript((s) => {
        document.documentElement.setAttribute("data-theme-coupon-style", s);
      }, style);

      for (const route of PUBLIC_ROUTES) {
        if (route.needsAuth && !userLoggedIn) continue;
        if (route.needsCart && !cartReady) continue;

        for (const scroll of SCROLL_MODES) {
          try {
            await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
            await waitStable(page);
            await scrollPage(page, scroll.id);
            pushIssue(
              report,
              await scanPage(page, {
                viewport: vp.label,
                couponStyle: style,
                route: route.name,
                path: route.path,
                scroll: scroll.label,
              }),
            );
          } catch (err) {
            report.push({
              viewport: vp.label,
              couponStyle: style,
              route: route.name,
              path: route.path,
              scroll: scroll.label,
              error: err instanceof Error ? err.message : String(err),
            });
          }
        }
      }

      await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" });
      await waitStable(page);
      for (const hit of await tryProductDetail(page, { viewport: vp.label, couponStyle: style })) {
        report.push(hit);
      }

      for (const hit of await tryPromotionDetail(page, { viewport: vp.label, couponStyle: style })) {
        report.push(hit);
      }

      if (userLoggedIn && cartReady && isMobile) {
        for (const hit of await tryCheckoutCouponSheet(page, { viewport: vp.label, couponStyle: style })) {
          report.push(hit);
        }
      }
    }

    if (adminLoggedIn) {
      for (const route of ADMIN_ROUTES) {
        if (route.needsAdmin && !adminLoggedIn) continue;
        try {
          await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
          await waitStable(page);
          await scrollPage(page, "bottom");
          pushIssue(
            report,
            await scanPage(page, {
              viewport: vp.label,
              couponStyle: "n/a",
              route: route.name,
              path: route.path,
              scroll: "底部",
              scope: "admin",
            }),
          );
        } catch (err) {
          report.push({
            viewport: vp.label,
            scope: "admin",
            route: route.name,
            path: route.path,
            error: err instanceof Error ? err.message : String(err),
          });
        }
      }
    } else if (adminApiOk || READ_ONLY_AUDIT) {
      try {
        await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
        await waitStable(page);
        pushIssue(
          report,
          await scanPage(page, {
            viewport: vp.label,
            couponStyle: "n/a",
            route: "后台登录",
            path: "/admin/login",
            scroll: "顶部",
            scope: "admin",
          }),
        );
      } catch {
        /* ignore */
      }
    }

    await context.close();
  }

  await browser.close();

  const realIssues = report.filter((r) => r.overlaps?.length || r.couponOverlaps?.length || r.pickerOverlaps?.length);

  const summary = {
    base: BASE,
    readOnly: READ_ONLY_AUDIT,
    viewports: VIEWPORTS.map((v) => v.label),
    couponStyles: COUPON_STYLES,
    auth: Boolean(userCreds),
    cartSeeded: cartReady,
    admin: adminApiOk,
    adminUiAuthenticated,
    adminAuthenticatedScan,
    apiAvailable,
    scannedPublicRoutes: PUBLIC_ROUTES.length,
    scrollModes: SCROLL_MODES.length,
    issueCount: realIssues.length,
    setupSkips,
    setupWarnings: report.filter((r) => r.phase === "setup" || r.error),
    issues: realIssues,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (REQUIRE_ADMIN_SCAN && adminApiOk && !adminAuthenticatedScan) {
    console.log("\n⚠ Extended audit: admin credentials were provided but authenticated admin UI scan did not run.");
    process.exit(1);
  }

  if (realIssues.length === 0) {
    console.log("\n✓ Extended overlap audit: no issues found.");
    process.exit(0);
  }
  console.log(`\n⚠ Extended audit: ${realIssues.length} issue(s).`);
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});

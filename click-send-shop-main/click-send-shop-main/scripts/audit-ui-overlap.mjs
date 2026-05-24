/**
 * UI overlap audit (extended).
 * Usage: node scripts/audit-ui-overlap.mjs
 * Env: BASE_URL, API_BASE_URL, VIEWPORTS (e.g. "390x844,375x667"), COUPON_STYLES_ALL=1, SKIP_AUTH=1, SKIP_ADMIN=1
 */
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://localhost:8080";
const API = process.env.API_BASE_URL
  ? `${process.env.API_BASE_URL.replace(/\/$/, "")}/api`
  : `${BASE.replace(/\/$/, "")}/api`;
const VIEWPORTS = (process.env.VIEWPORTS || "390x844,375x667,1280x800")
  .split(",")
  .map((s) => {
    const [w, h] = s.trim().split("x").map(Number);
    return { width: w, height: h, label: s.trim() };
  });
const COUPON_STYLES =
  process.argv.includes("--full") || process.env.COUPON_STYLES_ALL === "1"
    ? ["ticket", "premium", "deal", "minimal"]
    : ["ticket"];
const ADMIN_PHONE = process.env.ADMIN_PHONE || "18800000001";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123456";
const SKIP_AUTH = process.env.SKIP_AUTH === "1";
const SKIP_ADMIN = process.env.SKIP_ADMIN === "1";

const PUBLIC_ROUTES = [
  { path: "/", name: "首页" },
  { path: "/categories", name: "分类" },
  { path: "/new-arrivals", name: "新品" },
  { path: "/cart", name: "购物车" },
  { path: "/profile", name: "我的" },
  { path: "/coupons", name: "优惠券", needsAuth: true },
  { path: "/search", name: "搜索" },
  { path: "/login", name: "登录" },
  { path: "/help", name: "帮助" },
  { path: "/about", name: "关于" },
  { path: "/favorites", name: "收藏" },
  { path: "/history", name: "浏览记录" },
  { path: "/orders", name: "订单列表", needsAuth: true },
  { path: "/settings", name: "设置", needsAuth: true },
  { path: "/points", name: "积分", needsAuth: true },
  { path: "/rewards", name: "返现", needsAuth: true },
  { path: "/invite", name: "邀请", needsAuth: true },
  { path: "/address", name: "地址", needsAuth: true },
  { path: "/notifications", name: "通知", needsAuth: true },
  { path: "/returns", name: "售后", needsAuth: true },
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

const SCROLL_MODES = [
  { id: "top", label: "顶部" },
  { id: "middle", label: "中部" },
  { id: "bottom", label: "底部" },
];

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
  return { token, password, phone };
}

async function adminLogin() {
  const data = await jfetch(`${API}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  return data.token?.accessToken || data.token;
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
  const phoneInput = page.getByPlaceholder("手机号");
  if ((await phoneInput.count()) === 0) return false;
  await phoneInput.fill(phone);
  await page.getByPlaceholder("密码").fill(password);
  const loginBtn = page.locator("button").filter({ hasText: /^登\s*录$/ });
  if ((await loginBtn.count()) === 0) return false;
  await loginBtn.first().click();
  await page.waitForTimeout(2000);
  if (!page.url().includes("/login")) return true;
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded" });
  await waitStable(page);
  return !page.url().includes("/login");
}

async function loginAdminUi(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "domcontentloaded" });
  await waitStable(page);
  await page.getByPlaceholder("输入账号").fill(ADMIN_PHONE);
  await page.getByPlaceholder("输入密码").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(1500);
  return page.url().includes("/admin") && !page.url().includes("/admin/login");
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
      const tag = el.tagName;
      if (tag === "BUTTON" || tag === "A" || tag === "INPUT" || tag === "LABEL") return true;
      if (el.getAttribute("role") === "button") return true;
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
    for (const card of document.querySelectorAll("[data-coupon-card-layout]")) {
      const items = Array.from(card.querySelectorAll("p, span, button")).filter((el) => {
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
  await page.waitForLoadState("domcontentloaded");
  await page.waitForTimeout(700);
}

async function scrollPage(page, mode) {
  await page.evaluate((scrollId) => {
    const max = Math.max(document.documentElement.scrollHeight - innerHeight, 0);
    if (scrollId === "top") window.scrollTo(0, 0);
    else if (scrollId === "bottom") window.scrollTo(0, max);
    else window.scrollTo(0, Math.floor(max / 2));
  }, mode);
  await page.waitForTimeout(400);
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
    await page.goto(`${BASE}${href}`, { waitUntil: "domcontentloaded", timeout: 20000 });
    await waitStable(page);
    await scrollPage(page, scroll.id);
    const hit = await scanPage(page, { ...metaBase, route: "商品详情", path: href, scroll: scroll.label });
    if (hit) issues.push(hit);
  }
  return issues;
}

async function tryCheckoutCouponSheet(page, metaBase) {
  const issues = [];
  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 20000 });
  await waitStable(page);
  if (page.url().includes("/login")) return issues;

  const trigger = page.getByText(/选择优惠券|优惠券/).first();
  if ((await trigger.count()) === 0) return issues;
  await trigger.click();
  await page.waitForTimeout(600);

  const hit = await scanPage(page, { ...metaBase, route: "结算-选券弹层", path: "/checkout", scroll: "弹层打开" });
  if (hit) issues.push(hit);
  return issues;
}

function pushIssue(report, issue) {
  if (issue) report.push(issue);
}

async function main() {
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
      const user = await registerUser();
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
      report.push({ phase: "setup", error: `用户注册: ${e.message}` });
    }
  }

  let adminApiOk = false;
  if (!SKIP_ADMIN && apiAvailable) {
    try {
      await adminLogin();
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

    const page = await context.newPage();
    let userLoggedIn = false;
    if (userCreds) {
      userLoggedIn = await loginFrontend(page, userCreds.phone, userCreds.password);
      if (!userLoggedIn) {
        report.push({ phase: "setup", error: `前台 UI 登录失败 (${vp.label})` });
      }
    }

    let adminLoggedIn = false;
    if (adminApiOk) {
      adminLoggedIn = await loginAdminUi(page);
      if (!adminLoggedIn) {
        report.push({ phase: "setup", error: `后台 UI 登录失败 (${vp.label})` });
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
            await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 25000 });
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
          await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 25000 });
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
    } else if (adminApiOk) {
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
    viewports: VIEWPORTS.map((v) => v.label),
    couponStyles: COUPON_STYLES,
    auth: Boolean(userCreds),
    cartSeeded: cartReady,
    admin: adminApiOk,
    apiAvailable,
    scannedPublicRoutes: PUBLIC_ROUTES.length,
    scrollModes: SCROLL_MODES.length,
    issueCount: realIssues.length,
    setupSkips,
    setupWarnings: report.filter((r) => r.phase === "setup" || r.error),
    issues: realIssues,
  };

  console.log(JSON.stringify(summary, null, 2));

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

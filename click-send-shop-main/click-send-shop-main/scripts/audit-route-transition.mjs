import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE = (process.env.BASE_URL || "").replace(/\/$/, "");
const ADMIN_BASE = (process.env.ADMIN_BASE_URL || "").replace(/\/$/, "");
const ADMIN_ENTRY_URL = (process.env.ADMIN_ENTRY_URL || "").replace(/\/$/, "");
const ADMIN_ENTRY_PATH = process.env.ADMIN_ENTRY_PATH || "/admin-index.html";
const API_ORIGIN = (process.env.API_ORIGIN || "http://127.0.0.1:3000").replace(/\/$/, "");
const ADMIN_PHONE = process.env.ADMIN_PHONE || "18800000001";
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();
const MAX_LAYOUT_SHIFT = Number(process.env.ROUTE_AUDIT_MAX_CLS || "0.05");
const MAX_PREHEATED_FALLBACK_MS = Number(process.env.ROUTE_AUDIT_MAX_FALLBACK_MS || "80");
const SAMPLE_INTERVAL_MS = Number(process.env.ROUTE_AUDIT_SAMPLE_INTERVAL_MS || "40");
const SAMPLE_WINDOW_MS = Number(process.env.ROUTE_AUDIT_SAMPLE_WINDOW_MS || "920");
const NEW_ARRIVAL_CATEGORY_PATH = "/categories?is_new=1&home_new_arrivals_rule=1";

const publicRoutes = ["/", "/categories", "/promotions", "/cart", "/profile", "/search", NEW_ARRIVAL_CATEGORY_PATH];
const adminRoutes = ["/admin", "/admin/products", "/admin/orders", "/admin/settings/theme"];

const issues = [];
const warnings = [];

function addIssue(area, message, extra = {}) {
  issues.push({ area, message, ...extra });
}

function addWarning(area, message, extra = {}) {
  warnings.push({ area, message, ...extra });
}

function isStoreBottomNavHiddenPath(pathname) {
  return (
    pathname === "/search" ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/product/") ||
    pathname.startsWith("/promotions/")
  );
}

async function pickBaseUrl() {
  if (BASE) return BASE;
  for (const candidate of [
    "http://127.0.0.1:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:4174",
  ]) {
    try {
      const res = await fetch(`${candidate}/admin/login`, {
        redirect: "manual",
        signal: AbortSignal.timeout(1500),
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.includes('id="root"') || html.includes("id='root'")) return candidate;
    } catch {
      // try next candidate
    }
  }
  return "http://127.0.0.1:8080";
}

async function apiAdminLogin() {
  const origins = process.env.API_ORIGIN
    ? [API_ORIGIN]
    : [
        API_ORIGIN,
        "http://127.0.0.1:3010",
        "http://127.0.0.1:3012",
        "http://127.0.0.1:3013",
      ];
  const errors = [];

  for (const origin of [...new Set(origins.map((item) => item.replace(/\/$/, "")))]) {
    try {
      const res = await fetch(`${origin}/api/admin/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: ADMIN_PHONE, username: ADMIN_PHONE, password: ADMIN_PASSWORD }),
        signal: AbortSignal.timeout(12000),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.code !== 0) {
        errors.push(`${origin} -> ${body.message || `admin login ${res.status}`}`);
        continue;
      }
      const data = body.data || {};
      return {
        access: data.token?.accessToken || "",
        refresh: data.token?.refreshToken || "",
        csrf: data.csrfToken || "",
        cookies: readResponseCookies(res, origin),
        permissions: data.permissions || [],
        isSuperAdmin: Boolean(data.isSuperAdmin),
      };
    } catch (error) {
      errors.push(`${origin} -> ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  throw new Error(errors.join("; "));
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

function parseSetCookieHeader(header, origin) {
  const url = new URL(origin);
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
    else if (key === "domain" && value) {
      cookieDomain = value;
    } else if (key === "secure") cookie.secure = true;
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

function readResponseCookies(res, origin) {
  const headers = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : splitSetCookieHeader(res.headers.get("set-cookie") || "");
  return headers.map((header) => parseSetCookieHeader(header, origin)).filter(Boolean);
}

function bootstrapAdminSession(session) {
  localStorage.setItem("admin_access_token", session.access);
  localStorage.setItem("admin_refresh_token", session.refresh);
  localStorage.setItem("admin_authenticated", "1");
  if (session.csrf) localStorage.setItem("admin_csrf_token", session.csrf);
  localStorage.setItem(
    "admin-permissions",
    JSON.stringify({ state: { permissions: session.permissions, isSuperAdmin: session.isSuperAdmin }, version: 0 }),
  );
}

async function addLayoutShiftObserver(context) {
  await context.addInitScript(() => {
    window.__routeAuditShiftEntries = [];
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__routeAuditShiftEntries.push({
            value: entry.value || 0,
            hadRecentInput: Boolean(entry.hadRecentInput),
          });
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
    } catch {
      // Older browsers may not expose layout-shift entries.
    }
  });
}

async function resetLayoutShift(page) {
  await page.evaluate(() => {
    window.__routeAuditShiftEntries = [];
  });
}

async function readLayoutShift(page) {
  return page.evaluate(() => {
    const entries = Array.isArray(window.__routeAuditShiftEntries) ? window.__routeAuditShiftEntries : [];
    return entries.reduce((sum, entry) => sum + Number(entry.value || 0), 0);
  });
}

async function inspectViewportBlankness(page) {
  const buffer = await page.screenshot({ fullPage: false });
  const { data, info } = await sharp(buffer)
    .resize(64, 64, { fit: "fill" })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const buckets = new Set();
  let bright = 0;
  const pixels = info.width * info.height;

  for (let i = 0; i < data.length; i += info.channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    if (r > 246 && g > 246 && b > 246) bright += 1;
    buckets.add(`${r >> 5}:${g >> 5}:${b >> 5}`);
  }

  return {
    brightRatio: bright / pixels,
    colorBuckets: buckets.size,
  };
}

async function readFrameState(page) {
  return page.evaluate(() => {
    const fallback = document.querySelector("[data-route-fallback]");
    const storeShell = document.querySelector(".store-shell");
    const storeBottomNav = document.querySelector(".store-bottom-nav");
    const storeHeader = document.querySelector(".store-header-brand");
    const adminShell = document.querySelector("[data-admin-shell]");
    const adminChrome = document.querySelector(".admin-chrome");
    const adminSidebar = document.querySelector("[data-admin-shell] aside");

    function visible(el) {
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== "hidden" && style.display !== "none";
    }

    return {
      pathname: window.location.pathname,
      fallbackVisible: visible(fallback),
      fallbackKind: fallback?.getAttribute("data-route-fallback") || "",
      bodyTextLength: document.body.innerText.replace(/\s+/g, " ").trim().length,
      storeShellVisible: visible(storeShell),
      storeBottomNavVisible: visible(storeBottomNav),
      storeHeaderVisible: visible(storeHeader),
      adminShellVisible: visible(adminShell),
      adminChromeVisible: visible(adminChrome),
      adminSidebarVisible: visible(adminSidebar),
    };
  });
}

async function collectSamples(page, durationMs = SAMPLE_WINDOW_MS) {
  const samples = [];
  const start = Date.now();
  while (Date.now() - start <= durationMs) {
    samples.push({ at: Date.now() - start, ...(await readFrameState(page)) });
    await page.waitForTimeout(SAMPLE_INTERVAL_MS);
  }
  return samples;
}

async function routeByPopstate(page, path) {
  await page.evaluate((targetPath) => {
    window.history.pushState({}, "", targetPath);
    window.dispatchEvent(new PopStateEvent("popstate", { state: {} }));
  }, path);
}

function getRouteWaitTarget(path) {
  const url = new URL(path, "http://route-audit.local");
  return {
    pathname: url.pathname,
    search: url.search,
  };
}

async function waitForRouteSettle(page, path) {
  const target = getRouteWaitTarget(path);
  await page.waitForFunction(
    ({ pathname, search }) => (
      window.location.pathname === pathname
      && (!search || window.location.search === search)
      && !document.querySelector("[data-route-fallback]")
    ),
    target,
    { timeout: 8000 },
  ).catch(() => {});
  await page.waitForTimeout(220);
}

async function preheatRoutes(page, baseUrl, routes) {
  for (const route of routes) {
    await page.goto(`${baseUrl}${route}`, { waitUntil: "domcontentloaded", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(250);
  }
}

async function hasAppRoot(url) {
  try {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(1800),
    });
    if (!res.ok) return false;
    const html = await res.text();
    return html.includes('id="root"') || html.includes("id='root'");
  } catch {
    return false;
  }
}

async function resolveAdminLaunch(baseUrl) {
  if (ADMIN_ENTRY_URL) {
    return { mode: "entry", baseUrl, entryUrl: ADMIN_ENTRY_URL };
  }

  const directUrl = `${baseUrl}/admin/login`;
  if (await hasAppRoot(directUrl)) {
    return { mode: "direct", baseUrl, entryUrl: "" };
  }

  const normalizedEntryPath = ADMIN_ENTRY_PATH.startsWith("/") ? ADMIN_ENTRY_PATH : `/${ADMIN_ENTRY_PATH}`;
  const entryUrl = `${baseUrl}${normalizedEntryPath}`;
  if (await hasAppRoot(entryUrl)) {
    return { mode: "entry", baseUrl, entryUrl };
  }

  return { mode: "direct", baseUrl, entryUrl: "" };
}

async function gotoAdminRoute(page, launch, path) {
  if (launch.mode === "entry") {
    await page.goto(launch.entryUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(120);
    await routeByPopstate(page, path);
    await waitForRouteSettle(page, path);
    return;
  }

  await page.goto(`${launch.baseUrl}${path}`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForRouteSettle(page, path);
}

async function preheatAdminRoutes(page, launch, routes) {
  for (const route of routes) {
    await gotoAdminRoute(page, launch, route).catch(() => {});
    await page.waitForTimeout(250);
  }
}

function analyzeSamples(area, samples, options) {
  const fallbackMs = samples.filter((sample) => sample.fallbackVisible).length * SAMPLE_INTERVAL_MS;
  const minText = Math.min(...samples.map((sample) => sample.bodyTextLength));
  const shellMissing = samples.some((sample) => {
    if (options.scope === "admin") {
      return !sample.adminShellVisible || !sample.adminChromeVisible;
    }
    if (options.viewport === "mobile") {
      return !sample.storeShellVisible || (!isStoreBottomNavHiddenPath(sample.pathname || "") && !sample.storeBottomNavVisible);
    }
    return !sample.storeShellVisible || !sample.storeHeaderVisible;
  });

  if (fallbackMs > MAX_PREHEATED_FALLBACK_MS) {
    addIssue(area, "route fallback stayed visible during a preheated transition", { fallbackMs });
  } else if (fallbackMs > 0) {
    addWarning(area, "route fallback appeared briefly during a preheated transition", { fallbackMs });
  }
  if (minText < 8) {
    addIssue(area, "transition produced an almost empty body frame", { minText });
  }
  if (shellMissing) {
    addIssue(area, "navigation shell disappeared during transition");
  }
}

async function auditTransition(page, area, targetPath, options) {
  await resetLayoutShift(page);
  const samplesPromise = collectSamples(page);
  await routeByPopstate(page, targetPath);
  const samples = await samplesPromise;
  await waitForRouteSettle(page, targetPath);
  const cls = await readLayoutShift(page);
  const blank = await inspectViewportBlankness(page);

  analyzeSamples(area, samples, options);
  if (cls > MAX_LAYOUT_SHIFT) {
    addIssue(area, "layout shift exceeded threshold", { cls: Number(cls.toFixed(4)), max: MAX_LAYOUT_SHIFT });
  }
  if (blank.brightRatio > 0.985 || blank.colorBuckets < 4) {
    addIssue(area, "viewport looked blank or nearly blank after transition", blank);
  }

  return {
    area,
    targetPath,
    cls: Number(cls.toFixed(4)),
    brightRatio: Number(blank.brightRatio.toFixed(4)),
    colorBuckets: blank.colorBuckets,
  };
}

async function auditPublicMobile(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    ignoreHTTPSErrors: true,
  });
  await addLayoutShiftObserver(context);
  const page = await context.newPage();
  await preheatRoutes(page, baseUrl, publicRoutes);
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForRouteSettle(page, "/");

  const results = [];
  for (const path of ["/categories", "/promotions", "/cart", "/profile", "/search", "/"]) {
    results.push(await auditTransition(page, `public-mobile ${path}`, path, { scope: "store", viewport: "mobile" }));
  }
  await context.close();
  return results;
}

async function auditPublicDesktop(browser, baseUrl) {
  const context = await browser.newContext({
    viewport: { width: 1366, height: 768 },
    ignoreHTTPSErrors: true,
  });
  await addLayoutShiftObserver(context);
  const page = await context.newPage();
  await preheatRoutes(page, baseUrl, publicRoutes);
  await page.goto(`${baseUrl}/`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await waitForRouteSettle(page, "/");

  const results = [];
  for (const path of ["/categories", "/promotions", NEW_ARRIVAL_CATEGORY_PATH, "/search", "/"]) {
    results.push(await auditTransition(page, `public-desktop ${path}`, path, { scope: "store", viewport: "desktop" }));
  }

  const productPath = await page.locator('a[href^="/product/"]').first().getAttribute("href").catch(() => "");
  if (productPath) {
    await page.goto(`${baseUrl}/categories`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForRouteSettle(page, "/categories");
    await page.goto(`${baseUrl}${productPath}`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForRouteSettle(page, new URL(productPath, baseUrl).pathname);
    await page.goto(`${baseUrl}/categories`, { waitUntil: "domcontentloaded", timeout: 30000 });
    await waitForRouteSettle(page, "/categories");
    results.push(await auditTransition(page, `public-desktop ${productPath}`, new URL(productPath, baseUrl).pathname, { scope: "store", viewport: "desktop" }));
  } else {
    addWarning("public-desktop product", "no product link found; product detail transition skipped");
  }

  await context.close();
  return results;
}

async function auditAdmin(browser, launch, session) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    ignoreHTTPSErrors: true,
  });
  await addLayoutShiftObserver(context);
  if (session) {
    if (session.cookies?.length) {
      await context.addCookies(session.cookies);
    }
    await context.addInitScript(bootstrapAdminSession, session);
  }
  const page = await context.newPage();
  const results = [];

  await gotoAdminRoute(page, launch, "/admin/login");
  const loginText = await page.locator("body").innerText().catch(() => "");
  const loginInputCount = await page.locator("input").count().catch(() => 0);
  if (/\b404\b|页面不存在|Page not found/i.test(loginText) && loginInputCount === 0) {
    const message = "admin login page was not found; set ADMIN_BASE_URL/ADMIN_ENTRY_URL when admin-dist is served separately";
    if (process.env.ADMIN_BASE_URL || process.env.ADMIN_ENTRY_URL) addIssue("admin-login", message, launch);
    else addWarning("admin-login", message, launch);
    await context.close();
    return results;
  }
  const loginBlank = await inspectViewportBlankness(page);
  if (loginBlank.brightRatio > 0.985 || loginBlank.colorBuckets < 4) {
    addIssue("admin-login", "admin login viewport looked blank", loginBlank);
  }

  if (!session) {
    await context.close();
    addWarning("admin-authenticated", "admin API login failed or was skipped; authenticated admin transition audit not completed");
    return results;
  }

  await preheatAdminRoutes(page, launch, adminRoutes);
  await gotoAdminRoute(page, launch, "/admin");

  if (new URL(page.url()).pathname.includes("/admin/login")) {
    addWarning("admin-authenticated", "admin session bootstrap redirected to login; authenticated admin transition audit not completed");
    await context.close();
    return results;
  }

  for (const path of ["/admin/products", "/admin/orders", "/admin/settings/theme", "/admin"]) {
    results.push(await auditTransition(page, `admin ${path}`, path, { scope: "admin", viewport: "desktop" }));
  }

  await context.close();
  return results;
}

async function main() {
  const baseUrl = await pickBaseUrl();
  const adminBaseUrl = ADMIN_BASE || baseUrl;
  const adminLaunch = await resolveAdminLaunch(adminBaseUrl);
  let adminSession = null;
  if (ADMIN_PASSWORD) {
    try {
      adminSession = await apiAdminLogin();
    } catch (error) {
      addWarning("admin-authenticated", `admin API login unavailable: ${error instanceof Error ? error.message : String(error)}`);
    }
  } else {
    addWarning(
      "admin-authenticated",
      "ADMIN_PASSWORD env is missing; public route audit and admin login-page audit will run, authenticated admin transitions will be skipped",
    );
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];
  try {
    results.push(...await auditPublicMobile(browser, baseUrl));
    results.push(...await auditPublicDesktop(browser, baseUrl));
    results.push(...await auditAdmin(browser, adminLaunch, adminSession));
  } finally {
    await browser.close();
  }

  const summary = {
    baseUrl,
    adminBaseUrl,
    adminLaunch,
    thresholds: {
      maxLayoutShift: MAX_LAYOUT_SHIFT,
      maxPreheatedFallbackMs: MAX_PREHEATED_FALLBACK_MS,
    },
    results,
    warnings,
    issues,
  };

  console.log(JSON.stringify(summary, null, 2));
  if (issues.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`ROUTE_TRANSITION_AUDIT_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

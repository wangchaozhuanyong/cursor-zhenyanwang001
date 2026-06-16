/**
 * Authenticated admin smoke for the commerce restructure.
 *
 * Usage:
 *   ADMIN_USERNAME=15111122221 ADMIN_PASSWORD=*** \
 *   BASE_URL=https://damatong.net ADMIN_BASE_URL=https://console.damatong.net \
 *   npm run smoke:admin-auth-restructure
 *
 * This script is read-only. It logs in, validates the admin session, and opens
 * non-payment restructure pages: promotions, inventory, shipping, reports, and
 * audit logs. Payment pages are intentionally excluded.
 */
import { chromium } from "@playwright/test";

const ADMIN_ROUTES = [
  { path: "/admin", name: "admin dashboard", minRootChars: 80, expectAny: ["管理后台", "Dashboard", "订单", "库存"] },
  { path: "/admin/marketing", name: "marketing dashboard", minRootChars: 80, expectAny: ["统一活动管理", "营销", "活动管理"] },
  { path: "/admin/marketing/activities", name: "activity management", minRootChars: 80, expectAny: ["活动列表", "新建活动", "活动管理"] },
  { path: "/admin/marketing/activities/new", name: "activity create form", minRootChars: 120, expectAny: ["新建活动", "活动名称", "发布活动"] },
  { path: "/admin/marketing/coupon-campaigns", name: "coupon campaigns", minRootChars: 80, expectAny: ["领券活动", "新建领券活动", "优惠券"] },
  { path: "/admin/marketing/points", name: "points marketing", minRootChars: 80, expectAny: ["积分", "兑换", "奖励"] },
  { path: "/admin/inventory", name: "inventory center", minRootChars: 80, expectAny: ["库存", "可售", "锁定", "补货"] },
  { path: "/admin/replenishment", name: "replenishment center", minRootChars: 80, expectAny: ["智能补货", "补货", "库存"] },
  { path: "/admin/settings/shipping", name: "shipping rules", minRootChars: 80, expectAny: ["运费", "配送", "West Malaysia", "East Malaysia"] },
  { path: "/admin/orders", name: "orders list", minRootChars: 80, expectAny: ["订单", "Order", "物流", "库存"] },
  { path: "/admin/reports/promotions/conversion", name: "promotion conversion report", minRootChars: 80, expectAny: ["活动转化", "报表", "优惠"] },
  { path: "/admin/reports/discounts/cost", name: "discount cost report", minRootChars: 80, expectAny: ["优惠成本", "报表", "折扣"] },
  { path: "/admin/reports/inventory/occupancy", name: "inventory occupancy report", minRootChars: 80, expectAny: ["库存占用", "库存", "报表"] },
  { path: "/admin/reports/orders/cancel-reasons", name: "order cancel reason report", minRootChars: 80, expectAny: ["取消原因", "订单", "报表"] },
  { path: "/admin/audit-logs", name: "audit logs", minRootChars: 80, expectAny: ["审计", "操作日志", "管理端操作"] },
];

const VIEWPORTS = (process.env.ADMIN_SMOKE_VIEWPORTS || "1366x768,390x844")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => {
    const [width, height] = item.split("x").map(Number);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error(`Invalid ADMIN_SMOKE_VIEWPORTS entry: ${item}`);
    }
    return { label: item, width, height };
  });

const WAIT_MS = Number(process.env.ADMIN_SMOKE_WAIT_MS || 1200);
const NAV_TIMEOUT_MS = Number(process.env.ADMIN_SMOKE_NAV_TIMEOUT_MS || 20000);
const REQUIRE_AUTH = process.env.ADMIN_SMOKE_REQUIRE_AUTH === "1";
const SKIP_APP_ID_CHECK = process.env.ADMIN_SMOKE_SKIP_APP_ID_CHECK === "1";

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, "");
}

function credentialsFromEnv() {
  const username = String(process.env.ADMIN_USERNAME || process.env.ADMIN_SMOKE_USERNAME || "").trim();
  const password = String(process.env.ADMIN_PASSWORD || process.env.ADMIN_SMOKE_PASSWORD || "");
  return { username, password };
}

function isExpectedAdminHtml(html) {
  if (SKIP_APP_ID_CHECK) return true;
  return html.includes('data-app-scope="store"') || html.includes("管理后台") || html.includes("<title>Admin");
}

async function pickBaseUrls() {
  const baseUrl = normalizeBaseUrl(process.env.BASE_URL || "http://127.0.0.1:5177");
  const adminBaseUrl = normalizeBaseUrl(process.env.ADMIN_BASE_URL || process.env.BASE_URL || baseUrl);

  const adminResponse = await fetch(`${adminBaseUrl}/admin/login`, {
    redirect: "manual",
    signal: AbortSignal.timeout(4000),
  });
  const adminHtml = await adminResponse.text().catch(() => "");
  if (!adminResponse.ok || !adminHtml.includes("id=\"root\"")) {
    throw new Error(`ADMIN_BASE_URL does not look like an admin app: ${adminBaseUrl}`);
  }
  if (!isExpectedAdminHtml(adminHtml)) {
    throw new Error(`ADMIN_BASE_URL is not the expected 大马通 admin app: ${adminBaseUrl}`);
  }

  return { baseUrl, adminBaseUrl };
}

function routeHasExpectedText(route, pageText) {
  if (!route.expectAny?.length) return true;
  const lowerText = pageText.toLowerCase();
  return route.expectAny.some((token) => lowerText.includes(token.toLowerCase()));
}

function isExpectedNetworkNoise(message) {
  if (/favicon|manifest\.webmanifest|apple-touch-icon/i.test(message)) return true;
  if (/ResizeObserver loop/i.test(message)) return true;
  if (/googletagmanager\.com|google-analytics\.com/i.test(message)) return true;
  return false;
}

async function loginAdmin(page, adminBaseUrl, username, password) {
  await page.goto(`${adminBaseUrl}/admin/login`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  await page.waitForSelector("#root", { state: "attached", timeout: 8000 });

  const login = await page.evaluate(async ({ username: u, password: p }) => {
    const response = await fetch("/api/admin/auth/login", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: u, phone: u, password: p }),
    });
    const body = await response.json().catch(() => ({}));
    return {
      ok: response.ok,
      status: response.status,
      code: body?.code,
      message: body?.message || body?.error || "",
      data: body?.data || {},
    };
  }, { username, password });

  if (!login.ok || login.code !== 0) {
    throw new Error(`admin login failed: HTTP ${login.status} ${login.message || "unknown error"}`);
  }
  if (login.data?.mfaRequired || login.data?.mfaSetupRequired) {
    throw new Error("admin login requires MFA; authenticated smoke needs an MFA-free test admin or pre-trusted device");
  }

  await page.evaluate(() => {
    localStorage.setItem("admin_authenticated", "1");
  });

  const session = await page.evaluate(async () => {
    const [profileResponse, rbacResponse] = await Promise.all([
      fetch("/api/admin/account/profile", { credentials: "include" }),
      fetch("/api/admin/rbac/me", { credentials: "include" }),
    ]);
    const profileBody = await profileResponse.json().catch(() => ({}));
    const rbacBody = await rbacResponse.json().catch(() => ({}));
    return {
      profile: {
        ok: profileResponse.ok,
        status: profileResponse.status,
        code: profileBody?.code,
        isSuperAdmin: Boolean(profileBody?.data?.isSuperAdmin),
        roleCodes: Array.isArray(profileBody?.data?.roleCodes) ? profileBody.data.roleCodes : [],
      },
      rbac: {
        ok: rbacResponse.ok,
        status: rbacResponse.status,
        code: rbacBody?.code,
        isSuperAdmin: Boolean(rbacBody?.data?.isSuperAdmin),
        permissionCount: Array.isArray(rbacBody?.data?.permissions) ? rbacBody.data.permissions.length : 0,
      },
    };
  });

  if (!session.profile.ok || session.profile.code !== 0) {
    throw new Error(`admin profile check failed: HTTP ${session.profile.status}`);
  }
  if (!session.rbac.ok || session.rbac.code !== 0) {
    throw new Error(`admin rbac check failed: HTTP ${session.rbac.status}`);
  }

  return session;
}

async function inspectAdminRoute(page, adminBaseUrl, route, viewportLabel) {
  const consoleErrors = [];
  const pageErrors = [];
  const onConsole = (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  };
  const onPageError = (error) => {
    pageErrors.push(error.message);
  };

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  const url = `${adminBaseUrl}${route.path}`;
  let responseStatus = -1;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    responseStatus = response?.status() ?? -1;
    await page.waitForSelector("#root", { state: "attached", timeout: 8000 });
    await page.waitForTimeout(WAIT_MS);
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }

  const state = await page.evaluate(() => {
    const root = document.querySelector("#root");
    const rootText = (root?.textContent || "").replace(/\s+/g, " ").trim();
    const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
    const headings = Array.from(document.querySelectorAll("h1,h2,h3,[role='heading']"))
      .slice(0, 10)
      .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const doc = document.documentElement;
    const horizontalOverflow = Math.max(0, doc.scrollWidth - doc.clientWidth);
    return {
      href: location.href,
      title: document.title,
      rootChars: rootText.length,
      bodyText,
      bodySample: bodyText.slice(0, 260),
      headings,
      horizontalOverflow,
      hasRoot: Boolean(root),
      hasViteError: bodyText.includes("[plugin:vite]") || bodyText.includes("Internal server error"),
      hasRuntimeError:
        bodyText.includes("ReferenceError") ||
        bodyText.includes("TypeError") ||
        bodyText.includes("Cannot find module") ||
        bodyText.includes("Unhandled Runtime Error"),
      hasLoginPrompt: bodyText.includes("请使用管理员账号登录") || bodyText.includes("管理员账号 密码 登录"),
      hasNotFound: bodyText.includes("后台页面不存在"),
      hasForbidden: bodyText.includes("没有访问权限"),
      hasFeatureDisabled: bodyText.includes("功能暂未开启"),
    };
  });

  const failures = [];
  if (responseStatus >= 500) failures.push(`HTTP ${responseStatus}`);
  if (!state.hasRoot) failures.push("missing #root");
  if (state.href.includes("/admin/login")) failures.push("redirected to admin login");
  if (state.rootChars < route.minRootChars) failures.push(`root text too short (${state.rootChars})`);
  if (state.hasLoginPrompt) failures.push("login prompt visible after authenticated smoke");
  if (state.hasNotFound) failures.push("admin not-found fallback visible");
  if (state.hasForbidden) failures.push("admin forbidden fallback visible");
  if (state.hasFeatureDisabled) failures.push("admin feature-disabled fallback visible");
  if (state.hasViteError) failures.push("vite error visible");
  if (state.hasRuntimeError) failures.push("runtime error visible");
  if (state.horizontalOverflow > 24) failures.push(`horizontal overflow ${state.horizontalOverflow}px`);

  const pageText = `${state.title} ${state.headings.join(" ")} ${state.bodyText}`;
  if (!routeHasExpectedText(route, pageText)) failures.push(`missing expected text: ${route.expectAny.join(" / ")}`);
  failures.push(...pageErrors.map((message) => `page error: ${message}`));
  failures.push(...consoleErrors.filter((message) => !isExpectedNetworkNoise(message)).map((message) => `console error: ${message.slice(0, 240)}`));

  return {
    viewport: viewportLabel,
    route: route.name,
    path: route.path,
    status: responseStatus,
    href: state.href,
    title: state.title,
    rootChars: state.rootChars,
    headings: state.headings,
    bodySample: state.bodySample,
    warnings: consoleErrors.filter((message) => isExpectedNetworkNoise(message)).slice(0, 4),
    failures,
  };
}

async function main() {
  const { username, password } = credentialsFromEnv();
  if (!username || !password) {
    const skipped = {
      summary: {
        skipped: true,
        reason: "ADMIN_USERNAME and ADMIN_PASSWORD are required for authenticated admin smoke",
        checked: 0,
        failed: REQUIRE_AUTH ? 1 : 0,
        routes: ADMIN_ROUTES.map((route) => route.path),
        viewports: VIEWPORTS.map((viewport) => viewport.label),
      },
      failures: REQUIRE_AUTH ? [{ failure: "missing admin smoke credentials" }] : [],
      results: [],
    };
    console.log(JSON.stringify(skipped, null, 2));
    if (REQUIRE_AUTH) process.exitCode = 1;
    return;
  }

  const { baseUrl, adminBaseUrl } = await pickBaseUrls();
  const browser = await chromium.launch({ headless: true });
  const results = [];
  let session = null;

  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({
        ignoreHTTPSErrors: true,
        viewport: { width: viewport.width, height: viewport.height },
      });
      const currentSession = await loginAdmin(page, adminBaseUrl, username, password);
      session = session || currentSession;
      for (const route of ADMIN_ROUTES) {
        results.push(await inspectAdminRoute(page, adminBaseUrl, route, viewport.label));
      }
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const failures = results.flatMap((result) =>
    result.failures.map((failure) => ({
      viewport: result.viewport,
      path: result.path,
      route: result.route,
      failure,
      sample: result.bodySample,
    })),
  );

  const summary = {
    baseUrl,
    adminBaseUrl,
    authenticated: true,
    paymentRoutesExcluded: true,
    checked: results.length,
    failed: failures.length,
    session,
    routes: ADMIN_ROUTES.map((route) => route.path),
    viewports: VIEWPORTS.map((viewport) => viewport.label),
  };

  console.log(JSON.stringify({ summary, failures, results }, null, 2));
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`SMOKE_ADMIN_AUTH_RESTRUCTURE_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

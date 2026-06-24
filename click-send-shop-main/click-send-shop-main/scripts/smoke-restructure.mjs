/**
 * Restructure acceptance smoke for the commerce rebuild.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:5177 npm run smoke:restructure
 *   SMOKE_REQUIRE_API=1 BASE_URL=https://staging.example.com npm run smoke:restructure
 *   SMOKE_REQUIRE_API=1 BASE_URL=https://damatong.net ADMIN_BASE_URL=https://console.damatong.net npm run smoke:restructure
 *
 * Default mode is read-only and tolerates API connection failures so it can run
 * against a frontend-only dev server. Set SMOKE_REQUIRE_API=1 when a safe test
 * backend is available.
 */
import { chromium } from "@playwright/test";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const DEFAULT_ROUTES = [
  { path: "/", name: "store home", minRootChars: 80, expectAny: ["大马通", "首页"] },
  { path: "/categories", name: "categories", minRootChars: 60, expectAny: ["分类", "商品"] },
  { path: "/search", name: "search", minRootChars: 16, expectAny: ["搜索", "热门"] },
  { path: "/cart", name: "cart", minRootChars: 30, expectAny: ["购物车", "商品"] },
  { path: "/checkout", name: "checkout guard", minRootChars: 20, expectAny: ["结算", "欢迎回来", "登录"] },
  { path: "/payment/result?order_no=SMOKE", name: "payment result", minRootChars: 24, expectAny: ["支付", "付款", "订单", "确认"] },
  { path: "/orders", name: "orders guard", minRootChars: 20, expectAny: ["订单", "欢迎回来", "登录"] },
  { path: "/orders/SMOKE", name: "order detail guard", minRootChars: 20, expectAny: ["订单", "欢迎回来", "登录"] },
  { path: "/orders/SMOKE/logistics", name: "order logistics guard", minRootChars: 20, expectAny: ["物流", "欢迎回来", "登录"] },
  { path: "/coupons", name: "coupons", minRootChars: 40, expectAny: ["优惠券", "领券"] },
  { path: "/promotions", name: "promotions", minRootChars: 60, expectAny: ["活动", "优惠"] },
  { path: "/promotions/smoke-slug", name: "promotion detail fallback", minRootChars: 20, expectAny: ["活动", "优惠"] },
  { path: "/profile", name: "profile", minRootChars: 40, expectAny: ["我的", "会员", "未登录"] },
  { path: "/address", name: "address guard", minRootChars: 20, expectAny: ["地址", "欢迎回来", "登录"] },
  { path: "/favorites", name: "favorites", minRootChars: 30, expectAny: ["收藏"] },
  { path: "/notifications", name: "notifications guard", minRootChars: 20, expectAny: ["通知", "欢迎回来", "登录"] },
  { path: "/help", name: "help", minRootChars: 40, expectAny: ["帮助", "客服"] },
  { path: "/login", name: "login", minRootChars: 30, expectAny: ["欢迎回来", "登录"] },
  { path: "/register", name: "register", minRootChars: 30, expectAny: ["注册", "欢迎回来"] },
  { path: "/forgot-password", name: "forgot password", minRootChars: 30, expectAny: ["找回密码", "手机号"] },
  { path: "/login/bind-phone", name: "bind phone", minRootChars: 30, expectAny: ["绑定手机号", "登录"] },
  { path: "/invite", name: "invite guard", minRootChars: 20, expectAny: ["邀请", "欢迎回来", "登录"] },
  { path: "/support-download", name: "support download", minRootChars: 30, expectAny: ["客服", "帮助"] },
  { path: "/install", name: "install", minRootChars: 30, expectAny: ["安装", "桌面"] },
  { path: "/about", name: "about", minRootChars: 40, expectAny: ["关于", "大马通"] },
  { path: "/delivery", name: "delivery", minRootChars: 40, expectAny: ["配送", "物流"] },
  { path: "/feature-status", name: "feature status", minRootChars: 40, expectAny: ["功能状态", "功能"] },
  { path: "/feedback", name: "feedback", minRootChars: 30, expectAny: ["反馈", "意见"] },
  { path: "/content/contact-us", name: "cms contact", minRootChars: 30, expectAny: ["联系我们", "客服"] },
  { path: "/settings", name: "settings guard", minRootChars: 20, expectAny: ["设置", "欢迎回来", "登录"] },
  { path: "/member/benefits", name: "member benefits guard", minRootChars: 20, expectAny: ["会员", "欢迎回来", "登录"] },
  { path: "/points", name: "points guard", minRootChars: 20, expectAny: ["积分", "欢迎回来", "登录"] },
  { path: "/points/gifts", name: "points gifts guard", minRootChars: 20, expectAny: ["积分", "礼品", "欢迎回来", "登录"] },
  { path: "/rewards", name: "rewards guard", minRootChars: 20, expectAny: ["奖励", "返现", "欢迎回来", "登录"] },
  { path: "/wallet", name: "wallet guard", minRootChars: 20, expectAny: ["钱包", "返现", "欢迎回来", "登录"] },
  { path: "/returns", name: "returns guard", minRootChars: 20, expectAny: ["售后", "退货", "欢迎回来", "登录"] },
  { path: "/returns/SMOKE", name: "return detail guard", minRootChars: 20, expectAny: ["售后", "退货", "欢迎回来", "登录"] },
  { path: "/reviews/pending", name: "pending reviews guard", minRootChars: 20, expectAny: ["评价", "欢迎回来", "登录"] },
  { path: "/history", name: "history", minRootChars: 30, expectAny: ["浏览", "历史"] },
  { path: "/tiktok", name: "tiktok landing", minRootChars: 60, expectAny: ["大马通", "Damatong", "生活"] },
];

const ADMIN_ROUTES = [
  { path: "/admin/login", name: "admin login", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/marketing/activities", name: "admin promotion guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/payments/events", name: "admin payment event guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/payments/reconciliations", name: "admin payment reconciliation guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/inventory", name: "admin inventory guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/settings/shipping", name: "admin shipping guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/reports/promotions/conversion", name: "promotion conversion report guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/reports/discounts/cost", name: "discount cost report guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/reports/payments/failures", name: "payment failure report guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/reports/inventory/occupancy", name: "inventory occupancy report guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
  { path: "/admin/reports/orders/cancel-reasons", name: "order cancel reason report guard", minRootChars: 24, expectAny: ["管理后台", "Admin", "登录", "Login"] },
];

const LOCALIZED_PUBLIC_ROUTES = [
  {
    locale: "en",
    routes: [
      { path: "/en", name: "store home en", minRootChars: 80, expectAny: ["One-stop", "Home", "Official", "Browse"] },
      { path: "/en/deals", name: "deals center en", minRootChars: 60, expectAny: ["All promotions", "Deals", "Failed to load promotions"] },
      { path: "/en/deals/smoke-slug", name: "deals detail fallback en", minRootChars: 20, expectAny: ["Promotion unavailable", "All promotions"] },
      { path: "/en/cart", name: "cart en", minRootChars: 30, expectAny: ["Cart", "No items"] },
      { path: "/en/checkout", name: "checkout guard en", minRootChars: 20, expectAny: ["Welcome back", "Login"] },
      { path: "/en/payment/result?order_no=SMOKE", name: "payment result en", minRootChars: 24, expectAny: ["Payment", "Order"] },
      { path: "/en/orders", name: "orders guard en", minRootChars: 20, expectAny: ["Welcome back", "Login"] },
    ],
  },
  {
    locale: "ms",
    routes: [
      { path: "/ms", name: "store home ms", minRootChars: 80, expectAny: ["Damatong", "Laman", "Rasmi", "Produk"] },
      { path: "/ms/deals", name: "deals center ms", minRootChars: 60, expectAny: ["Semua promosi", "Promosi", "Gagal memuatkan promosi"] },
      { path: "/ms/deals/smoke-slug", name: "deals detail fallback ms", minRootChars: 20, expectAny: ["Promosi tidak tersedia", "Semua promosi"] },
      { path: "/ms/cart", name: "cart ms", minRootChars: 30, expectAny: ["Troli", "Tiada item"] },
      { path: "/ms/checkout", name: "checkout guard ms", minRootChars: 20, expectAny: ["Selamat kembali", "Log masuk"] },
      { path: "/ms/payment/result?order_no=SMOKE", name: "payment result ms", minRootChars: 24, expectAny: ["Bayaran", "Pesanan"] },
      { path: "/ms/orders", name: "orders guard ms", minRootChars: 20, expectAny: ["Selamat kembali", "Log masuk"] },
    ],
  },
];

const VIEWPORTS = (process.env.SMOKE_VIEWPORTS || "1366x768,390x844")
  .split(",")
  .map((item) => item.trim())
  .filter(Boolean)
  .map((item) => {
    const [width, height] = item.split("x").map(Number);
    if (!Number.isFinite(width) || !Number.isFinite(height)) {
      throw new Error(`Invalid SMOKE_VIEWPORTS entry: ${item}`);
    }
    return { label: item, width, height };
  });

const REQUIRE_API = process.env.SMOKE_REQUIRE_API === "1";
const ENABLE_ADMIN_ROUTES = process.env.SMOKE_ADMIN === "1" || Boolean(process.env.ADMIN_BASE_URL);
const ENABLE_LOCALIZED_ROUTES = process.env.SMOKE_LOCALES === "1";
const SKIP_APP_ID_CHECK = process.env.SMOKE_SKIP_APP_ID_CHECK === "1";
const WAIT_MS = Number(process.env.SMOKE_WAIT_MS || 800);
const NAV_TIMEOUT_MS = Number(process.env.SMOKE_NAV_TIMEOUT_MS || 18000);
const ROOT_TEXT_TIMEOUT_MS = Number(process.env.SMOKE_ROOT_TEXT_TIMEOUT_MS || 5000);
const BASE_URL_TIMEOUT_MS = Number(process.env.SMOKE_BASE_URL_TIMEOUT_MS || 8000);
const BLOCK_SERVICE_WORKERS = process.env.SMOKE_ALLOW_SERVICE_WORKER !== "1";

const ROUTES = [
  ...DEFAULT_ROUTES,
  ...(ENABLE_ADMIN_ROUTES ? ADMIN_ROUTES : []),
  ...(ENABLE_LOCALIZED_ROUTES ? LOCALIZED_PUBLIC_ROUTES.flatMap((group) => group.routes) : []),
];

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, "");
}

function readHtml(url, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = (parsed.protocol === "https:" ? httpsRequest : httpRequest)(
      parsed,
      { method: "GET", timeout: timeoutMs },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({ ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 400), status: response.statusCode || 0, body });
        });
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error(`Timed out after ${timeoutMs}ms`));
    });
    request.on("error", reject);
    request.end();
  });
}

function isExpectedAppHtml(html) {
  if (SKIP_APP_ID_CHECK) return true;
  return html.includes('data-app-scope="store"') && html.includes("大马通");
}

function isExpectedAdminHtml(html) {
  if (SKIP_APP_ID_CHECK) return true;
  return isExpectedAppHtml(html) || html.includes("管理后台") || html.includes("<title>Admin");
}

function isAdminRoute(route) {
  return route.path.startsWith("/admin/");
}

async function assertAdminBaseUrl(adminBaseUrl) {
  const adminResponse = await readHtml(`${adminBaseUrl}/admin/login`, BASE_URL_TIMEOUT_MS);
  const adminHtml = adminResponse.body;
  if (!adminResponse.ok || !adminHtml.includes("id=\"root\"")) {
    throw new Error(`ADMIN_BASE_URL does not look like an admin app: ${adminBaseUrl}`);
  }
  if (!isExpectedAdminHtml(adminHtml)) {
    throw new Error(`ADMIN_BASE_URL is not the expected 大马通 admin app: ${adminBaseUrl}`);
  }
}

async function pickBaseUrls() {
  if (process.env.BASE_URL) {
    const baseUrl = normalizeBaseUrl(process.env.BASE_URL);
    const adminBaseUrl = process.env.ADMIN_BASE_URL ? normalizeBaseUrl(process.env.ADMIN_BASE_URL) : baseUrl;
    const storeResponse = await readHtml(`${baseUrl}/`, BASE_URL_TIMEOUT_MS);
    const storeHtml = storeResponse.body;
    if (!storeResponse.ok || !storeHtml.includes("id=\"root\"")) {
      throw new Error(`BASE_URL does not look like a storefront app: ${baseUrl}`);
    }
    if (!isExpectedAppHtml(storeHtml)) {
      throw new Error(`BASE_URL is not the expected 大马通 storefront app: ${baseUrl}`);
    }

    if (ENABLE_ADMIN_ROUTES) {
      await assertAdminBaseUrl(adminBaseUrl);
    }
    return { baseUrl, adminBaseUrl };
  }

  const candidates = [
    "http://127.0.0.1:5177",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:8080",
  ];
  for (const candidate of candidates) {
    try {
      const response = await readHtml(`${candidate}/`, 1200);
      const html = response.body;
      if (response.ok && html.includes("id=\"root\"") && isExpectedAppHtml(html)) {
        return { baseUrl: candidate, adminBaseUrl: candidate };
      }
    } catch {
      // Try the next local frontend port.
    }
  }

  throw new Error("No 大马通 frontend server found. Start Vite/preview or set BASE_URL.");
}

function isExpectedNetworkNoise(message, route = null) {
  if (/favicon|manifest\.webmanifest|apple-touch-icon/i.test(message)) return true;
  if (/googletagmanager\.com|google-analytics\.com/i.test(message)) return true;
  if (route?.path?.includes("/payment/result?order_no=SMOKE") && /\b401\b|Unauthorized/i.test(message)) return true;
  if (route?.path?.includes("/promotions/smoke-slug") && /\b404\b|Not Found/i.test(message)) return true;
  if (route?.path?.includes("/deals/smoke-slug") && /\b404\b|Not Found/i.test(message)) return true;
  if (!REQUIRE_API && /ERR_CONNECTION_REFUSED|Failed to load resource|NetworkError|Load failed/i.test(message)) return true;
  if (!REQUIRE_API && /\/api\/|\/admin\/api\//i.test(message)) return true;
  if (!REQUIRE_API && /\b(401|403)\b/.test(message)) return true;
  return false;
}

function routeHasExpectedText(route, pageText) {
  if (!route.expectAny?.length) return true;
  return route.expectAny.some((token) => pageText.toLowerCase().includes(token.toLowerCase()));
}

async function inspectRoute(page, baseUrl, adminBaseUrl, route, viewportLabel) {
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

  const url = `${isAdminRoute(route) ? adminBaseUrl : baseUrl}${route.path}`;
  let responseStatus = -1;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
    responseStatus = response?.status() ?? -1;
    await page.waitForSelector("#root", { state: "attached", timeout: 8000 });
    await page.waitForFunction(
      (minRootChars) => ((document.querySelector("#root")?.textContent || "").replace(/\s+/g, " ").trim().length >= minRootChars),
      route.minRootChars,
      { timeout: ROOT_TEXT_TIMEOUT_MS },
    ).catch(() => {
      // The final assertion below reports blank or short-root states with route context.
    });
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
      .slice(0, 8)
      .map((node) => (node.textContent || "").replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const doc = document.documentElement;
    const horizontalOverflow = Math.max(0, doc.scrollWidth - doc.clientWidth);
    return {
      href: location.href,
      title: document.title,
      rootChars: rootText.length,
      bodyText,
      bodySample: bodyText.slice(0, 220),
      headings,
      horizontalOverflow,
      hasRoot: Boolean(root),
      hasViteError: bodyText.includes("[plugin:vite]") || bodyText.includes("Internal server error"),
      hasRuntimeError:
        bodyText.includes("ReferenceError") ||
        bodyText.includes("TypeError") ||
        bodyText.includes("Cannot find module") ||
        bodyText.includes("Unhandled Runtime Error"),
    };
  });

  const failures = [];
  if (responseStatus >= 500) failures.push(`HTTP ${responseStatus}`);
  if (!state.hasRoot) failures.push("missing #root");
  if (state.rootChars < route.minRootChars) failures.push(`root text too short (${state.rootChars})`);
  if (state.hasViteError) failures.push("vite error visible");
  if (state.hasRuntimeError) failures.push("runtime error visible");
  if (state.horizontalOverflow > 8) failures.push(`horizontal overflow ${state.horizontalOverflow}px`);
  const pageText = `${state.title} ${state.headings.join(" ")} ${state.bodyText}`;
  if (!routeHasExpectedText(route, pageText)) failures.push(`missing expected text: ${route.expectAny.join(" / ")}`);
  failures.push(...pageErrors.map((message) => `page error: ${message}`));
  failures.push(...consoleErrors.filter((message) => !isExpectedNetworkNoise(message, route)).map((message) => `console error: ${message.slice(0, 240)}`));

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
    warnings: consoleErrors.filter((message) => isExpectedNetworkNoise(message, route)).slice(0, 4),
    failures,
  };
}

async function main() {
  const { baseUrl, adminBaseUrl } = await pickBaseUrls();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const viewport of VIEWPORTS) {
      const context = await browser.newContext({
        ignoreHTTPSErrors: true,
        viewport: { width: viewport.width, height: viewport.height },
        serviceWorkers: BLOCK_SERVICE_WORKERS ? "block" : "allow",
      });
      try {
        for (const route of ROUTES) {
          const page = await context.newPage();
          try {
            results.push(await inspectRoute(page, baseUrl, adminBaseUrl, route, viewport.label));
          } finally {
            await page.close();
          }
        }
      } finally {
        await context.close();
      }
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
    requireApi: REQUIRE_API,
    checked: results.length,
    failed: failures.length,
    serviceWorkers: BLOCK_SERVICE_WORKERS ? "blocked" : "allowed",
    routeIsolation: "new-page",
    rootTextTimeoutMs: ROOT_TEXT_TIMEOUT_MS,
    baseUrlTimeoutMs: BASE_URL_TIMEOUT_MS,
    routes: ROUTES.map((route) => route.path),
    viewports: VIEWPORTS.map((viewport) => viewport.label),
  };

  console.log(JSON.stringify({ summary, failures, results }, null, 2));
  if (failures.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`SMOKE_RESTRUCTURE_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

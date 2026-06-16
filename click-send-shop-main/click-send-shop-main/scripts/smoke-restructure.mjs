/**
 * Restructure acceptance smoke for the commerce rebuild.
 *
 * Usage:
 *   BASE_URL=http://127.0.0.1:5177 npm run smoke:restructure
 *   SMOKE_REQUIRE_API=1 BASE_URL=https://staging.example.com npm run smoke:restructure
 *
 * Default mode is read-only and tolerates API connection failures so it can run
 * against a frontend-only dev server. Set SMOKE_REQUIRE_API=1 when a safe test
 * backend is available.
 */
import { chromium } from "@playwright/test";

const DEFAULT_ROUTES = [
  { path: "/", name: "store home", minRootChars: 80, expectAny: ["大马通", "首页", "Home", "Official"] },
  { path: "/promotions", name: "promotion center", minRootChars: 60, expectAny: ["活动", "优惠", "Promotions", "Promosi"] },
  { path: "/promotions/smoke-slug", name: "promotion detail fallback", minRootChars: 20 },
  { path: "/cart", name: "cart", minRootChars: 30, expectAny: ["购物车", "Cart", "Troli"] },
  { path: "/checkout", name: "checkout guard", minRootChars: 20 },
  { path: "/payment/result?order_no=SMOKE", name: "payment result", minRootChars: 24, expectAny: ["支付", "付款", "Payment", "Bayaran", "订单"] },
  { path: "/orders", name: "orders guard", minRootChars: 20 },
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
      { path: "/en/promotions", name: "promotion center en", minRootChars: 60, expectAny: ["All promotions", "Promotions", "Failed to load promotions"] },
      { path: "/en/promotions/smoke-slug", name: "promotion detail fallback en", minRootChars: 20, expectAny: ["Promotion unavailable", "All promotions"] },
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
      { path: "/ms/promotions", name: "promotion center ms", minRootChars: 60, expectAny: ["Semua promosi", "Promosi", "Gagal memuatkan promosi"] },
      { path: "/ms/promotions/smoke-slug", name: "promotion detail fallback ms", minRootChars: 20, expectAny: ["Promosi tidak tersedia", "Semua promosi"] },
      { path: "/ms/cart", name: "cart ms", minRootChars: 30, expectAny: ["Troli", "Tiada item"] },
      { path: "/ms/checkout", name: "checkout guard ms", minRootChars: 20, expectAny: ["Selamat kembali", "Log masuk"] },
      { path: "/ms/payment/result?order_no=SMOKE", name: "payment result ms", minRootChars: 24, expectAny: ["Bayaran", "Pesanan"] },
      { path: "/ms/orders", name: "orders guard ms", minRootChars: 20, expectAny: ["Selamat kembali", "Log masuk"] },
    ],
  },
];

const ROUTES = [
  ...DEFAULT_ROUTES,
  ...LOCALIZED_PUBLIC_ROUTES.flatMap((group) => group.routes),
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
const SKIP_APP_ID_CHECK = process.env.SMOKE_SKIP_APP_ID_CHECK === "1";
const WAIT_MS = Number(process.env.SMOKE_WAIT_MS || 800);
const NAV_TIMEOUT_MS = Number(process.env.SMOKE_NAV_TIMEOUT_MS || 18000);

function normalizeBaseUrl(value) {
  return value.replace(/\/$/, "");
}

function isExpectedAppHtml(html) {
  if (SKIP_APP_ID_CHECK) return true;
  return html.includes('data-app-scope="store"') && html.includes("大马通");
}

async function pickBaseUrl() {
  if (process.env.BASE_URL) {
    const baseUrl = normalizeBaseUrl(process.env.BASE_URL);
    const response = await fetch(`${baseUrl}/admin/login`, {
      redirect: "manual",
      signal: AbortSignal.timeout(3000),
    });
    const html = await response.text().catch(() => "");
    if (!response.ok || !html.includes("id=\"root\"")) {
      throw new Error(`BASE_URL does not look like a Vite app: ${baseUrl}`);
    }
    if (!isExpectedAppHtml(html)) {
      throw new Error(`BASE_URL is not the expected 大马通 storefront/admin app: ${baseUrl}`);
    }
    return baseUrl;
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
      const response = await fetch(`${candidate}/admin/login`, {
        redirect: "manual",
        signal: AbortSignal.timeout(1200),
      });
      const html = await response.text().catch(() => "");
      if (response.ok && html.includes("id=\"root\"") && isExpectedAppHtml(html)) return candidate;
    } catch {
      // Try the next local frontend port.
    }
  }

  throw new Error("No 大马通 frontend server found. Start Vite/preview or set BASE_URL.");
}

function isExpectedNetworkNoise(message) {
  if (/favicon|manifest\.webmanifest|apple-touch-icon/i.test(message)) return true;
  if (/googletagmanager\.com|google-analytics\.com/i.test(message)) return true;
  if (!REQUIRE_API && /ERR_CONNECTION_REFUSED|Failed to load resource|NetworkError|Load failed/i.test(message)) return true;
  if (!REQUIRE_API && /\/api\/|\/admin\/api\//i.test(message)) return true;
  if (!REQUIRE_API && /\b(401|403)\b/.test(message)) return true;
  return false;
}

function routeHasExpectedText(route, pageText) {
  if (!route.expectAny?.length) return true;
  return route.expectAny.some((token) => pageText.toLowerCase().includes(token.toLowerCase()));
}

async function inspectRoute(page, baseUrl, route, viewportLabel) {
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

  const url = `${baseUrl}${route.path}`;
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
    warnings: consoleErrors.filter(isExpectedNetworkNoise).slice(0, 4),
    failures,
  };
}

async function main() {
  const baseUrl = await pickBaseUrl();
  const browser = await chromium.launch({ headless: true });
  const results = [];

  try {
    for (const viewport of VIEWPORTS) {
      const page = await browser.newPage({
        ignoreHTTPSErrors: true,
        viewport: { width: viewport.width, height: viewport.height },
      });
      for (const route of ROUTES) {
        results.push(await inspectRoute(page, baseUrl, route, viewport.label));
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
    requireApi: REQUIRE_API,
    checked: results.length,
    failed: failures.length,
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

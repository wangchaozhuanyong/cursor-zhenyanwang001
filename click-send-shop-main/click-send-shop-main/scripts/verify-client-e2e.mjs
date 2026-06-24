/**
 * 客户端全站冒烟 + 轻量交互检测（Playwright）
 * 用法：BASE_URL=https://your-domain.com node scripts/verify-client-e2e.mjs
 * 本地：先启动 server:3000 + npm run dev:8080 或 preview，BASE_URL=http://127.0.0.1:8080
 */
import { chromium } from "@playwright/test";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");

const STATIC_ROUTES = [
  { path: "/", name: "首页" },
  { path: "/categories", name: "分类" },
  { path: "/new-arrivals", name: "新品" },
  { path: "/search", name: "搜索" },
  { path: "/promotions", name: "活动列表" },
  { path: "/promotions/smoke-slug", name: "活动详情占位" },
  { path: "/deals", name: "旧活动入口重定向" },
  { path: "/deals/smoke-slug", name: "旧活动详情入口重定向" },
  { path: "/cart", name: "购物车" },
  { path: "/checkout", name: "结算(应跳转登录)" },
  { path: "/payment/result?order_no=SMOKE", name: "支付结果" },
  { path: "/orders", name: "订单列表(应跳转登录)" },
  { path: "/orders/SMOKE", name: "订单详情(应跳转登录)" },
  { path: "/orders/SMOKE/logistics", name: "物流详情(应跳转登录)" },
  { path: "/coupons", name: "优惠券" },
  { path: "/favorites", name: "收藏" },
  { path: "/profile", name: "我的" },
  { path: "/address", name: "地址(应跳转登录)" },
  { path: "/history", name: "浏览记录" },
  { path: "/notifications", name: "通知(应跳转登录)" },
  { path: "/login", name: "登录" },
  { path: "/register", name: "注册" },
  { path: "/forgot", name: "找回密码别名" },
  { path: "/forgot-password", name: "找回密码" },
  { path: "/login/bind-phone", name: "绑定手机号" },
  { path: "/help", name: "帮助" },
  { path: "/support-download", name: "客服下载" },
  { path: "/install", name: "安装应用" },
  { path: "/about", name: "关于" },
  { path: "/delivery", name: "配送说明" },
  { path: "/feature-status", name: "功能状态" },
  { path: "/feedback", name: "意见反馈" },
  { path: "/content/contact-us", name: "CMS 内容页" },
  { path: "/settings", name: "设置(应跳转登录)" },
  { path: "/member/benefits", name: "会员权益(应跳转登录)" },
  { path: "/member-benefits", name: "会员权益别名重定向" },
  { path: "/points", name: "积分(应跳转登录)" },
  { path: "/points/gifts", name: "积分礼品(应跳转登录)" },
  { path: "/rewards", name: "奖励记录(应跳转登录)" },
  { path: "/wallet", name: "钱包(应跳转登录)" },
  { path: "/returns", name: "售后(应跳转登录)" },
  { path: "/returns/SMOKE", name: "售后详情(应跳转登录)" },
  { path: "/reviews/pending", name: "待评价(应跳转登录)" },
  { path: "/invite", name: "邀请好友(应跳转登录)" },
  { path: "/tiktok", name: "大马通独立页" },
];

const issues = [];
const DEFAULT_MIN_ROOT_CHARS = 16;

function record(severity, area, message, extra = {}) {
  issues.push({ severity, area, message, ...extra });
}

function isExpectedConsoleNoise(path, text) {
  if (/favicon|404.*\.(png|ico)/i.test(text)) return true;
  if ((path === "/promotions/smoke-slug" || path === "/deals/smoke-slug") && /\b404\b|Not Found/i.test(text)) {
    return true;
  }
  if (path.startsWith("/payment/result") && /\b401\b|Unauthorized/i.test(text)) {
    return true;
  }
  return false;
}

async function readPageState(page) {
  return page.evaluate(() => {
    const root = document.querySelector("#root");
    const rootText = (root?.textContent || "").replace(/\s+/g, " ").trim();
    const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
    const doc = document.documentElement;
    return {
      hasRoot: Boolean(root),
      rootChars: rootText.length,
      bodySample: bodyText.slice(0, 220),
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
      hasViteError: bodyText.includes("[plugin:vite]") || bodyText.includes("Internal server error"),
      hasRuntimeError:
        bodyText.includes("ReferenceError") ||
        bodyText.includes("TypeError") ||
        bodyText.includes("Cannot find module") ||
        bodyText.includes("Unhandled Runtime Error"),
    };
  });
}

async function visitRoute(page, { path, name }) {
  const url = `${BASE}${path}`;
  const consoleErrors = [];
  const onConsole = (msg) => {
    if (msg.type() === "error") {
      const t = msg.text();
      if (isExpectedConsoleNoise(path, t)) return;
      consoleErrors.push(t);
    }
  };
  const onPageError = (err) => consoleErrors.push(`[pageerror] ${err.message}`);

  page.on("console", onConsole);
  page.on("pageerror", onPageError);

  let httpStatus = -1;
  let hasErrorBoundary = false;
  let title = "";
  let state = null;
  try {
    const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });
    httpStatus = res?.status() ?? -1;
    await page.waitForTimeout(800);
    title = await page.title();
    hasErrorBoundary = await page.getByText("页面出错了").isVisible().catch(() => false);
    state = await readPageState(page);
  } catch (err) {
    record("error", name, err instanceof Error ? err.message : String(err), { path, url });
  } finally {
    page.off("console", onConsole);
    page.off("pageerror", onPageError);
  }

  if (httpStatus >= 500) {
    record("error", name, `HTTP ${httpStatus}`, { path, url });
  }
  if (state && !state.hasRoot) {
    record("error", name, "缺少 #root", { path, url });
  }
  if (state && state.rootChars < DEFAULT_MIN_ROOT_CHARS) {
    record("error", name, `页面内容过短 (${state.rootChars})`, { path, sample: state.bodySample });
  }
  if (state && state.horizontalOverflow > 8) {
    record("error", name, `横向溢出 ${state.horizontalOverflow}px`, { path, sample: state.bodySample });
  }
  if (state?.hasViteError) {
    record("error", name, "Vite 错误可见", { path, sample: state.bodySample });
  }
  if (state?.hasRuntimeError) {
    record("error", name, "运行时错误文本可见", { path, sample: state.bodySample });
  }
  if (hasErrorBoundary) {
    const detail = await page.locator("text=页面出错了").locator("..").textContent().catch(() => "");
    record("error", name, "页面错误边界", { path, detail: (detail || "").slice(0, 300) });
  }
  for (const ce of consoleErrors) {
    if (/Failed to construct 'IntersectionObserver'/.test(ce)) {
      record("error", name, "IntersectionObserver rootMargin（需重新部署前端修复）", { path, console: ce });
    } else if (/502|Bad Gateway/.test(ce)) {
      record("error", name, "API 502", { path, console: ce.slice(0, 200) });
    } else {
      record("warn", name, "控制台错误", { path, console: ce.slice(0, 200) });
    }
  }

  return {
    path,
    name,
    httpStatus,
    title,
    consoleErrors: consoleErrors.length,
    hasErrorBoundary,
    rootChars: state?.rootChars ?? 0,
    horizontalOverflow: state?.horizontalOverflow ?? 0,
  };
}

async function flowHomeToProduct(page) {
  const area = "首页→商品详情";
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1200);
    const card = page.locator('a[href^="/product/"]').first();
    const count = await card.count();
    if (count === 0) {
      record("warn", area, "首页未找到商品链接", { path: "/" });
      return;
    }
    await card.click();
    await page.waitForURL(/\/product\//, { timeout: 15000 });
    await page.waitForTimeout(1000);
    if (await page.getByText("页面出错了").isVisible().catch(() => false)) {
      const errText = await page.locator("body").innerText().catch(() => "");
      record("error", area, "商品详情崩溃", { url: page.url(), snippet: errText.slice(0, 400) });
    } else {
      const addBtn = page.getByRole("button", { name: /加入购物车|立即购买|选规格/i }).first();
      if (!(await addBtn.isVisible().catch(() => false))) {
        record("warn", area, "详情页未找到加购/购买按钮", { url: page.url() });
      }
    }
  } catch (err) {
    record("error", area, err instanceof Error ? err.message : String(err));
  }
}

async function flowPromotionsToDetail(page) {
  const area = "活动列表→活动详情";
  try {
    await page.goto(`${BASE}/promotions`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1200);
    const card = page.locator('a[href^="/promotions/"]').first();
    const count = await card.count();
    if (count === 0) {
      record("warn", area, "活动列表未找到活动详情链接", { path: "/promotions" });
      return;
    }
    const href = await card.getAttribute("href");
    await card.click();
    await page.waitForTimeout(1000);
    if (href && !new URL(page.url()).pathname.includes(href.replace(/\?.*$/, ""))) {
      record("warn", area, "点击后 URL 未进入对应活动详情", { expected: href, actual: page.url() });
    }
    if (await page.getByText("页面出错了").isVisible().catch(() => false)) {
      const errText = await page.locator("body").innerText().catch(() => "");
      record("error", area, "活动详情崩溃", { url: page.url(), snippet: errText.slice(0, 400) });
    }
  } catch (err) {
    record("error", area, err instanceof Error ? err.message : String(err));
  }
}

async function flowCategories(page) {
  const area = "分类页";
  try {
    await page.goto(`${BASE}/categories`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1000);
    if (await page.getByText("页面出错了").isVisible().catch(() => false)) {
      record("error", area, "页面错误边界");
    }
  } catch (err) {
    record("error", area, err instanceof Error ? err.message : String(err));
  }
}

async function flowSearch(page) {
  const area = "搜索";
  try {
    await page.goto(`${BASE}/search`, { waitUntil: "domcontentloaded", timeout: 45000 });
    const input = page.locator('input[type="search"], input[placeholder*="搜索"]').first();
    if (await input.isVisible().catch(() => false)) {
      await input.fill("test");
      await page.keyboard.press("Enter");
      await page.waitForTimeout(1200);
    }
    if (await page.getByText("页面出错了").isVisible().catch(() => false)) {
      record("error", area, "页面错误边界");
    }
  } catch (err) {
    record("error", area, err instanceof Error ? err.message : String(err));
  }
}

async function flowCheckoutGuard(page) {
  const area = "结算页守卫";
  try {
    await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1200);
    const url = page.url();
    if (await page.getByText("页面出错了").isVisible().catch(() => false)) {
      record("error", area, "结算页错误边界", { url });
      return;
    }
    const onLogin = /\/login/i.test(url);
    const onCart = /\/cart/i.test(url);
    if (!onLogin && !onCart && !url.includes("/checkout")) {
      record("warn", area, "未登录时未重定向到登录或购物车", { url });
    }
  } catch (err) {
    record("error", area, err instanceof Error ? err.message : String(err));
  }
}

async function flowBottomNav(page) {
  const area = "底部导航";
  const tabs = [
    { label: "首页", path: "/" },
    { label: "分类", path: "/categories" },
    { label: "购物车", path: "/cart" },
    { label: "我的", path: "/profile" },
  ];
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1200);
    for (const tab of tabs) {
      const link = page.locator(`[data-store-nav-path="${tab.path}"]`).first();
      const fallbackLink = page.getByRole("button", { name: tab.label }).first();
      const target = (await link.isVisible().catch(() => false)) ? link : fallbackLink;
      if (!(await target.isVisible().catch(() => false))) {
        record("warn", area, `未找到导航：${tab.path}`);
        continue;
      }
      await target.click();
      await page.waitForTimeout(900);
      const currentPath = new URL(page.url()).pathname;
      if (tab.path === "/" ? currentPath !== "/" : !currentPath.includes(tab.path)) {
        record("warn", area, `点击后 URL 异常`, { expected: tab.path, actual: page.url() });
      }
      if (await page.getByText("页面出错了").isVisible().catch(() => false)) {
        record("error", area, `导航到 ${tab.path} 后崩溃`);
      }
    }
  } catch (err) {
    record("error", area, err instanceof Error ? err.message : String(err));
  }
}

async function probeApiHealth(request) {
  const area = "API 健康";
  try {
    const res = await request.get(`${BASE}/api/health/live`, { timeout: 15000 });
    if (!res.ok()) {
      record(res.status() === 502 ? "error" : "warn", area, `health/live → ${res.status()}`);
    }
  } catch (err) {
    record("warn", area, err instanceof Error ? err.message : String(err));
  }
}

async function probeLoginApi(request) {
  const area = "登录 API";
  try {
    const res = await request.post(`${BASE}/api/auth/login`, {
      data: { account: "__e2e_probe__", password: "invalid" },
      timeout: 15000,
    });
    const status = res.status();
    if (status === 502 || status === 503 || status === 504) {
      record("error", area, `登录接口网关错误 HTTP ${status}`);
    } else if (status >= 500) {
      record("error", area, `登录接口服务器错误 HTTP ${status}`);
    }
  } catch (err) {
    record("error", area, err instanceof Error ? err.message : String(err));
  }
}

async function flowLoginCarousel(page) {
  const area = "登录页";
  try {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(1500);
    const account = page.locator("#auth-phone, input[type='tel'], input[type='text'], input[type='email'], input[name='account'], input[autocomplete='username']").first();
    const password = page.locator("#auth-password, input[type='password']").first();
    const submit = page.locator("form .auth-login-submit, form button[type='submit']").first();
    if (await account.isVisible().catch(() => false)) {
      await account.click();
      await page.waitForTimeout(400);
    } else {
      record("warn", area, "未找到登录账号输入框");
    }
    const remember = page.getByRole("checkbox", { name: /记住/i }).first();
    if (await remember.isVisible().catch(() => false)) {
      await remember.click();
      await page.waitForTimeout(400);
    }
    if (!(await password.isVisible().catch(() => false))) {
      record("warn", area, "未找到登录密码输入框");
    }
    if (!(await submit.isVisible().catch(() => false))) {
      record("warn", area, "未找到登录提交按钮");
    }
    if (await page.getByText("页面出错了").isVisible().catch(() => false)) {
      record("error", area, "页面错误边界");
    }
  } catch (err) {
    record("error", area, err instanceof Error ? err.message : String(err));
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 375, height: 667 },
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1",
    ignoreHTTPSErrors: true,
  });
  const page = await context.newPage();
  const request = context.request;

  console.log(`\n=== 客户端检测 BASE=${BASE} ===\n`);

  await probeApiHealth(request);
  await probeLoginApi(request);

  const routeResults = [];
  for (const route of STATIC_ROUTES) {
    routeResults.push(await visitRoute(page, route));
  }

  await flowHomeToProduct(page);
  await flowPromotionsToDetail(page);
  await flowCategories(page);
  await flowSearch(page);
  await flowBottomNav(page);
  await flowCheckoutGuard(page);
  await flowLoginCarousel(page);

  await browser.close();

  const errors = issues.filter((i) => i.severity === "error");
  const warns = issues.filter((i) => i.severity === "warn");
  const ok = errors.length === 0;

  const report = {
    ok,
    base: BASE,
    testedAt: new Date().toISOString(),
    routes: routeResults,
    summary: { errors: errors.length, warnings: warns.length },
    issues: issues,
  };

  console.log(JSON.stringify(report, null, 2));
  if (!ok) process.exit(1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

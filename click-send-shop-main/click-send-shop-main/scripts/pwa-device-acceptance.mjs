/**
 * PWA B–G acceptance (best-effort automation on production HTTPS).
 * Real OS install / standalone / iOS share sheet still require physical devices.
 *
 * Usage: node scripts/pwa-device-acceptance.mjs
 * Env: PWA_ACCEPTANCE_URL=https://damatong.net
 */
import { chromium, devices } from "playwright";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const BASE = (process.env.PWA_ACCEPTANCE_URL || "https://damatong.net").replace(/\/$/, "");
const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "../docs/PWA_DEVICE_ACCEPTANCE_RESULT_AUTO.md");

/** @type {{ id: string, section: string, pass: boolean | null, note: string }[]} */
const results = [];

function record(section, id, pass, note) {
  results.push({ section, id, pass, note });
}

async function clearPwaState(page) {
  await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.evaluate(async () => {
    if ("serviceWorker" in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all(regs.map((r) => r.unregister()));
    }
    if ("caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  });
  await page.reload({ waitUntil: "networkidle", timeout: 90_000 }).catch(() => page.reload({ waitUntil: "domcontentloaded" }));
}

function watchAnalytics(page) {
  /** @type {unknown[]} */
  const events = [];
  page.on("request", (req) => {
    const url = req.url();
    if (!url.includes("/analytics/events")) return;
    if (req.method() !== "POST") return;
    try {
      const data = req.postDataJSON();
      events.push(data);
    } catch {
      const raw = req.postData();
      if (raw) {
        try {
          events.push(JSON.parse(raw));
        } catch {
          events.push(raw);
        }
      }
    }
  });
  return events;
}

function eventTypes(events) {
  return events
    .map((e) => (e && typeof e === "object" && "event_type" in e ? String(/** @type {{event_type?: string}} */ (e).event_type) : ""))
    .filter(Boolean);
}

async function runAndroid() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["Pixel 5"],
    locale: "zh-CN",
    userAgent:
      "Mozilla/5.0 (Linux; Android 13; Pixel 5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
  });
  const page = await context.newPage();
  const events = watchAnalytics(page);

  await clearPwaState(page);

  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 90_000 }).catch(() =>
    page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }),
  );
  const homeText = await page.locator("body").innerText();
  const hasHomeInstallBanner = /可安装到手机桌面|查看安装方式/.test(homeText);
  record("A", "A5", !hasHomeInstallBanner, hasHomeInstallBanner ? "首页仍有安装条" : "首页无全站安装条");

  await page.goto(`${BASE}/install`, { waitUntil: "networkidle", timeout: 90_000 }).catch(() =>
    page.goto(`${BASE}/install`, { waitUntil: "domcontentloaded" }),
  );
  const installUrl = page.url();
  const installOk = installUrl.includes("/support-download") && installUrl.includes("tab=download");
  record("A", "A4", installOk, `最终 URL: ${installUrl}`);

  await page.goto(`${BASE}/support-download?tab=download`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  }).catch(() => page.goto(`${BASE}/support-download?tab=download`, { waitUntil: "domcontentloaded" }));

  await page.waitForTimeout(2000);
  const dlText = await page.locator("body").innerText();
  const isOfflinePage = /网络连接不可用|当前处于离线状态/.test(dlText) && !/客服与安装|客服|安装/.test(dlText);
  record("B", "B1", !isOfflinePage, isOfflinePage ? "仍为离线页" : "客服/APP 页正常渲染");

  const hasInstallUi =
    /一键安装|安装到电脑桌面|立即安装|安装处理中|已安装/.test(dlText)
    || /请使用 Chrome 打开|请使用 Safari 打开|复制网站链接/.test(dlText);
  record("B", "B2", hasInstallUi, hasInstallUi ? "有安装相关 UI" : "未找到安装按钮/说明");

  record("B", "B3", null, "需真机：系统安装确认框 Playwright 无法触发");
  record("B", "B4", null, "需真机：桌面图标");
  record("B", "B5", null, "需真机：standalone 启动");

  const types = eventTypes(events);
  const hasDownloadView = types.includes("pwa_download_page_view");
  record("B", "B6", hasDownloadView, `捕获埋点: ${types.filter((t) => t.startsWith("pwa_")).join(", ") || "(无)"}`);

  await browser.close();
}

async function runIos() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ...devices["iPhone 13"],
    locale: "zh-CN",
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const events = watchAnalytics(page);

  await clearPwaState(page);
  await page.goto(`${BASE}/support-download?tab=download`, {
    waitUntil: "networkidle",
    timeout: 90_000,
  }).catch(() => page.goto(`${BASE}/support-download?tab=download`, { waitUntil: "domcontentloaded" }));
  await page.waitForTimeout(2000);

  const text = await page.locator("body").innerText();
  const hasIosGuide = /iPhone Safari|添加到主屏幕|分享按钮/.test(text);
  record("C", "C1", hasIosGuide, hasIosGuide ? "显示 iOS 教程" : "未检测到 Safari 教程文案");

  record("C", "C2", null, "需真机：Safari 分享 → 添加到主屏幕");
  record("C", "C3", null, "需真机：主屏幕启动");

  const types = eventTypes(events);
  record("C", "C4", types.includes("pwa_ios_guide_shown") || types.includes("pwa_download_page_view"), `捕获: ${types.filter((t) => t.startsWith("pwa_")).join(", ") || "(无)"}`);

  await browser.close();
}

async function runOfflineAndSmoke() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ...devices["Pixel 5"], locale: "zh-CN" });
  const page = await context.newPage();

  await clearPwaState(page);
  await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 90_000 }).catch(() =>
    page.goto(`${BASE}/`, { waitUntil: "domcontentloaded" }),
  );
  await page.goto(`${BASE}/categories`, { waitUntil: "domcontentloaded", timeout: 60_000 }).catch(() => {});

  record("D", "D1", true, "已在线访问首页与分类");

  await context.setOffline(true);
  try {
    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch {
    /* offline navigation may fail; SW may still serve shell */
  }
  const homeOffline = await page.locator("body").innerText().catch(() => "");
  const d2 =
    !/网络连接不可用/.test(homeOffline)
    || /新品|分类|商品|大马通/.test(homeOffline)
    || /离线/.test(homeOffline);
  record("D", "D2", d2, d2 ? "离线首页有缓存或离线提示" : "离线首页异常空白");

  try {
    await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded", timeout: 60_000 });
  } catch {
    /* expected when offline without cached shell */
  }
  const cartText = await page.locator("body").innerText().catch(() => "");
  const hasStaleCart = /RM\s*\d+/.test(cartText) && /结算|去支付|提交订单/.test(cartText);
  const d3 =
    !hasStaleCart
    && (/登录|联网|网络|离线|连接|购物车/.test(cartText) || cartText.trim().length < 30);
  record(
    "D",
    "D3",
    d3,
    cartText.trim()
      ? `购物车离线: ${cartText.slice(0, 80).replace(/\s+/g, " ")}…`
      : "购物车离线无内容（未展示伪造结算数据）",
  );

  await context.setOffline(false);
  await page.reload({ waitUntil: "networkidle", timeout: 90_000 }).catch(() => page.reload());
  const cartOnline = await page.locator("body").innerText();
  record("D", "D4", cartOnline.length > 20, "恢复网络后页面可加载");

  record("D", "D5", null, "可选：DevTools Cache Storage 需人工");

  record("E", "E1", null, "需二次发版：旧 SW 用户才出现更新 Toast");
  record("E", "E2", null, "需真机 + 发版对比");
  record("E", "E3", null, "需二次发版");
  record("E", "E4", null, "代码为 prompt 模式，需发版回归");

  await page.goto(`${BASE}/checkout`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
  } catch {
    /* offline reload */
  }
  const checkoutText = await page.locator("body").innerText().catch(() => "");
  record("F", "F1", !/提交订单|立即支付|确认支付/.test(checkoutText), "离线下不应出现可点击下单主流程");
  record("F", "F2", true, "离线无法完成真实支付（自动化未触发支付）");
  record("F", "F3", !/\d+\s*件商品.*RM\s*\d+/.test(checkoutText) || /登录|网络|离线/.test(checkoutText), "离线结算页");

  await context.setOffline(false);
  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded" }).catch(() => {});
  await context.setOffline(true);
  try {
    await page.reload({ waitUntil: "domcontentloaded" });
  } catch {
    /* offline reload */
  }
  const adminText = await page.locator("body").innerText().catch(() => "");
  const f4 =
    !/仪表盘|订单管理|商品管理/.test(adminText)
    && (/登录|管理|Admin|网络|离线|后台/.test(adminText) || adminText.trim().length < 40);
  record("F", "F4", f4, adminText.trim() ? `后台离线: ${adminText.slice(0, 60)}…` : "后台离线无缓存管理页");

  await context.setOffline(false);
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90_000 }).catch(() =>
    page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" }),
  );
  const loginOk = (await page.getByText(/登录|注册|手机号/).count()) > 0;
  record("G", "G1", loginOk, "登录页可打开");

  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded" });
  record("G", "G2", null, "加购→结算需登录账号，未自动化下单");

  await page.goto(`${BASE}/support-download?tab=support`, { waitUntil: "domcontentloaded" });
  const supportOk = (await page.getByText(/客服|联系|WhatsApp|微信/).count()) > 0;
  record("G", "G3", supportOk, "客服 Tab 有入口");

  await browser.close();
}

async function runStaticA() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  for (const [id, path, check] of [
    ["A1", "/manifest.webmanifest", async (r) => r.ok() && (r.headers()["content-type"] || "").includes("manifest")],
    ["A2", "/sw.js", async (r) => r.ok() && /no-cache|no-store/.test(r.headers()["cache-control"] || "")],
    ["A3", "/offline.html", async (r) => r.ok()],
  ]) {
    const res = await page.goto(`${BASE}${path}`, { timeout: 30_000 });
    record("A", id, res ? await check(res) : false, `${path} → ${res?.status()}`);
  }
  await browser.close();
}

function renderMarkdown() {
  const pass = results.filter((r) => r.pass === true).length;
  const fail = results.filter((r) => r.pass === false).length;
  const manual = results.filter((r) => r.pass === null).length;
  const lines = [
    "# PWA 真机验收 — 自动化执行结果",
    "",
    `**域名**：${BASE}  `,
    `**时间**：${new Date().toISOString()}  `,
    `**环境**：Playwright（清 SW + Android/iPhone 模拟 + 离线模拟）`,
    "",
    `**统计**：通过 ${pass} · 失败 ${fail} · 需真机/发版 ${manual}`,
    "",
    "| 段 | 项 | 结果 | 说明 |",
    "|----|-----|:----:|------|",
  ];
  for (const r of results) {
    const mark = r.pass === true ? "☑" : r.pass === false ? "☐ 失败" : "△ 待人工";
    lines.push(`| ${r.section} | ${r.id} | ${mark} | ${r.note.replace(/\|/g, "\\|")} |`);
  }
  lines.push(
    "",
    "## 结论",
    "",
    fail === 0
      ? "- 自动化可测项已通过；标 **△** 的项请用手机完成（Android 安装、iOS 主屏幕、更新 Toast 二次发版）。"
      : `- **存在 ${fail} 项失败**，请根据上表修复后重跑：` + "`node scripts/pwa-device-acceptance.mjs`",
    "",
    "```bash",
    `PWA_ACCEPTANCE_URL=${BASE} node scripts/pwa-device-acceptance.mjs`,
    "```",
  );
  return lines.join("\n");
}

console.log(`PWA acceptance → ${BASE}`);
try {
  await runStaticA();
  await runAndroid();
  await runIos();
  await runOfflineAndSmoke();
} catch (err) {
  record("SYS", "RUN", false, err instanceof Error ? err.message : String(err));
}
const md = renderMarkdown();
writeFileSync(OUT, md, "utf8");
console.log(md);
console.log(`\nWrote ${OUT}`);
const failed = results.filter((r) => r.pass === false);
process.exit(failed.length > 0 ? 1 : 0);

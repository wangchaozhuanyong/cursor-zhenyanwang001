import { spawn } from "node:child_process";
import { chromium } from "@playwright/test";

const REQUESTED_BASE_URL = String(process.env.BASE_URL || "").trim().replace(/\/$/, "");
const DEFAULT_BASE_URL = "http://127.0.0.1:4173";
const AUDIT_PATH = process.env.STOREFRONT_PERF_PATH || "/promotions?type=flash_sale";
const AUDIT_SKIN = String(process.env.STOREFRONT_PERF_SKIN || "").trim();
const CPU_THROTTLE_RATE = readBudget("STOREFRONT_PERF_CPU_RATE", 4);
const INITIAL_SETTLE_MS = readBudget("STOREFRONT_PERF_INITIAL_SETTLE_MS", 1500);
const IDLE_WINDOW_MS = readBudget("STOREFRONT_PERF_IDLE_WINDOW_MS", 16000);

const budgets = {
  initialJsKb: readBudget("STOREFRONT_PERF_MAX_INITIAL_JS_KB", 490),
  initialCssKb: readBudget("STOREFRONT_PERF_MAX_INITIAL_CSS_KB", 250),
  idleJsKb: readBudget("STOREFRONT_PERF_MAX_IDLE_JS_KB", 4),
  idleCssKb: readBudget("STOREFRONT_PERF_MAX_IDLE_CSS_KB", 2),
  singleLongTaskMs: readBudget("STOREFRONT_PERF_MAX_LONG_TASK_MS", 110),
  totalBlockingMs: readBudget("STOREFRONT_PERF_MAX_TOTAL_BLOCKING_MS", 100),
  cartTransitionMs: readBudget("STOREFRONT_PERF_MAX_CART_TRANSITION_MS", 300),
};

const issues = [];
const warnings = [];

function readBudget(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a non-negative number`);
  }
  return value;
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function toKb(bytes) {
  return round(bytes / 1024);
}

function buildAuditUrl(baseUrl, pathname) {
  const url = new URL(pathname, `${baseUrl}/`);
  if (AUDIT_SKIN) url.searchParams.set("skin", AUDIT_SKIN);
  return url.toString();
}

function addIssue(area, message, details = {}) {
  issues.push({ area, message, ...details });
}

function addWarning(area, message, details = {}) {
  warnings.push({ area, message, ...details });
}

function capturePageDiagnostics(page) {
  const events = [];
  const record = (type, message) => {
    if (events.length < 20) events.push({ type, message: String(message).slice(0, 500) });
  };
  page.on("pageerror", (error) => record("pageerror", error.message));
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      record(`console:${message.type()}`, message.text());
    }
  });
  page.on("requestfailed", (request) => {
    record("requestfailed", `${request.method()} ${request.url()} ${request.failure()?.errorText || ""}`);
  });
  return events;
}

async function isStorefrontReady(baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/`, {
      redirect: "manual",
      signal: AbortSignal.timeout(1500),
    });
    if (!response.ok) return false;
    const html = await response.text();
    const hasRoot = html.includes('id="root"') || html.includes("id='root'");
    return hasRoot && html.includes("/browser-preboot.js");
  } catch {
    return false;
  }
}

async function waitForStorefront(baseUrl, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (await isStorefrontReady(baseUrl)) return;
    if (child?.exitCode !== null) {
      throw new Error(`Vite preview exited with code ${child.exitCode}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`Timed out waiting for storefront preview at ${baseUrl}`);
}

async function resolveBaseUrl() {
  if (REQUESTED_BASE_URL) {
    await waitForStorefront(REQUESTED_BASE_URL);
    return { baseUrl: REQUESTED_BASE_URL, preview: null, previewOutput: [] };
  }

  if (await isStorefrontReady(DEFAULT_BASE_URL)) {
    return { baseUrl: DEFAULT_BASE_URL, preview: null, previewOutput: [] };
  }

  const previewOutput = [];
  const preview = spawn(
    process.execPath,
    ["node_modules/vite/bin/vite.js", "preview", "--host", "127.0.0.1", "--port", "4173", "--strictPort"],
    {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const capture = (chunk) => {
    previewOutput.push(String(chunk));
    if (previewOutput.length > 20) previewOutput.shift();
  };
  preview.stdout.on("data", capture);
  preview.stderr.on("data", capture);
  await waitForStorefront(DEFAULT_BASE_URL, preview);
  return { baseUrl: DEFAULT_BASE_URL, preview, previewOutput };
}

async function stopPreview(preview) {
  if (!preview || preview.exitCode !== null) return;
  preview.kill("SIGTERM");
  await Promise.race([
    new Promise((resolve) => preview.once("exit", resolve)),
    new Promise((resolve) => setTimeout(resolve, 2000)),
  ]);
  if (preview.exitCode === null) preview.kill("SIGKILL");
}

async function configureMeasuredContext(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    ignoreHTTPSErrors: true,
    serviceWorkers: "block",
  });
  await context.addInitScript(() => {
    window.__storefrontAuditLongTasks = [];
    window.__storefrontAuditToastEvents = [];
    window.addEventListener("storefront:toast", (event) => {
      window.__storefrontAuditToastEvents.push(event.detail);
    });
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          window.__storefrontAuditLongTasks.push({
            startTime: entry.startTime,
            duration: entry.duration,
          });
        }
      });
      observer.observe({ entryTypes: ["longtask"] });
    } catch {
      // Chromium supports long tasks; keep the audit usable on older local browsers.
    }
  });
  return context;
}

async function enableColdCpuProfile(context, page) {
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  await session.send("Network.setCacheDisabled", { cacheDisabled: true });
  await session.send("Emulation.setCPUThrottlingRate", { rate: CPU_THROTTLE_RATE });
  return session;
}

async function stubLocalApi(page, baseUrl) {
  const hostname = new URL(baseUrl).hostname;
  if (hostname !== "127.0.0.1" && hostname !== "localhost") return;

  await page.route("**/api/**", async (route) => {
    const requestPathname = new URL(route.request().url()).pathname;
    if (!requestPathname.startsWith("/api/")) {
      await route.continue();
      return;
    }
    const pathname = requestPathname.replace(/^\/api/, "");
    let data = {};

    if (pathname === "/categories" || pathname === "/products/tags") {
      data = [];
    } else if (pathname === "/products" || pathname === "/marketing/promotions") {
      data = {
        list: [],
        total: 0,
        page: 1,
        pageSize: 60,
        totalPages: 0,
      };
    } else if (pathname === "/home/bootstrap-lite" || pathname === "/home/bootstrap") {
      data = {
        siteInfo: {},
        siteCapabilities: {},
        runtimeConfig: {},
        homeOps: {},
        banners: [],
        categories: [],
        products: {
          hot: [],
          new_arrivals: [],
          recommended: [],
        },
        marketing: {
          flashSale: null,
          promotionBanners: [],
          fullReductionNotices: [],
          couponZone: null,
          couponCenter: null,
          newUserGift: null,
        },
      };
    } else if (pathname === "/theme/skins") {
      data = {
        defaultSkinId: "default_life_green",
        activeSkinId: "default_life_green",
        holidayRules: [],
        skins: [],
      };
    }
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ code: 0, message: "ok", data }),
    });
  });
}

async function waitForStorefrontMain(page) {
  await page.locator("main").first().waitFor({ state: "visible", timeout: 30_000 });
  await page.waitForTimeout(INITIAL_SETTLE_MS);
}

async function readAssetEntries(page) {
  return page.evaluate(() => performance.getEntriesByType("resource")
    .filter((entry) => {
      try {
        const pathname = new URL(entry.name).pathname;
        return pathname.endsWith(".js") || pathname.endsWith(".css");
      } catch {
        return false;
      }
    })
    .map((entry) => {
      const pathname = new URL(entry.name).pathname;
      return {
        key: `${entry.name}@${entry.startTime}`,
        name: pathname.split("/").pop() || pathname,
        url: entry.name,
        type: pathname.endsWith(".css") ? "css" : "js",
        decodedBodySize: entry.decodedBodySize || 0,
        transferSize: entry.transferSize || 0,
        startTime: entry.startTime,
        duration: entry.duration,
      };
    }));
}

function summarizeAssets(entries) {
  const js = entries.filter((entry) => entry.type === "js");
  const css = entries.filter((entry) => entry.type === "css");
  return {
    jsKb: toKb(js.reduce((sum, entry) => sum + entry.decodedBodySize, 0)),
    cssKb: toKb(css.reduce((sum, entry) => sum + entry.decodedBodySize, 0)),
    jsFiles: js.length,
    cssFiles: css.length,
    files: entries.map((entry) => entry.name).sort(),
  };
}

async function readLongTasks(page) {
  return page.evaluate(() => Array.isArray(window.__storefrontAuditLongTasks)
    ? window.__storefrontAuditLongTasks
    : []);
}

function summarizeLongTasks(entries) {
  const durations = entries.map((entry) => Number(entry.duration || 0)).filter(Number.isFinite);
  return {
    count: durations.length,
    maxMs: round(durations.length ? Math.max(...durations) : 0),
    totalBlockingMs: round(durations.reduce((sum, duration) => sum + Math.max(0, duration - 50), 0)),
    durationsMs: durations.map((duration) => round(duration)),
  };
}

function checkMaximum(area, actual, maximum, unit) {
  if (actual <= maximum) return;
  addIssue(area, `budget exceeded: ${actual}${unit} > ${maximum}${unit}`, { actual, maximum, unit });
}

async function auditPerformance(browser, baseUrl) {
  const context = await configureMeasuredContext(browser);
  const page = await context.newPage();
  const diagnostics = capturePageDiagnostics(page);
  await enableColdCpuProfile(context, page);
  await stubLocalApi(page, baseUrl);

  await page.goto(buildAuditUrl(baseUrl, AUDIT_PATH), { waitUntil: "domcontentloaded", timeout: 30_000 });
  try {
    await waitForStorefrontMain(page);
  } catch (error) {
    const bodyText = await page.locator("body").innerText().catch(() => "");
    throw new Error(
      `${error instanceof Error ? error.message : String(error)}; `
      + `page diagnostics=${JSON.stringify(diagnostics)}; body=${bodyText.replace(/\s+/g, " ").trim().slice(0, 800)}`,
    );
  }

  const initialAssets = await readAssetEntries(page);
  const initialLongTasks = await readLongTasks(page);
  const initial = summarizeAssets(initialAssets);
  const longTasks = summarizeLongTasks(initialLongTasks);

  await page.waitForTimeout(IDLE_WINDOW_MS);
  const afterIdleAssets = await readAssetEntries(page);
  const initialKeys = new Set(initialAssets.map((entry) => entry.key));
  const idleAssets = afterIdleAssets.filter((entry) => !initialKeys.has(entry.key));
  const idle = summarizeAssets(idleAssets);

  const cartButton = page.locator('button[data-store-nav-path="/cart"]');
  await cartButton.waitFor({ state: "visible", timeout: 10_000 });
  const transitionStartedAt = await page.evaluate(() => performance.now());
  await Promise.all([
    page.waitForURL((url) => url.pathname.endsWith("/cart"), { timeout: 10_000 }),
    cartButton.click(),
  ]);
  await page.locator("main").first().waitFor({ state: "visible", timeout: 10_000 });
  await page.evaluate(() => new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(resolve));
  }));
  const cartTransitionMs = round(await page.evaluate((start) => performance.now() - start, transitionStartedAt));

  checkMaximum("initial-js", initial.jsKb, budgets.initialJsKb, "KB");
  checkMaximum("initial-css", initial.cssKb, budgets.initialCssKb, "KB");
  checkMaximum("idle-js", idle.jsKb, budgets.idleJsKb, "KB");
  checkMaximum("idle-css", idle.cssKb, budgets.idleCssKb, "KB");
  checkMaximum("initial-long-task", longTasks.maxMs, budgets.singleLongTaskMs, "ms");
  checkMaximum("initial-total-blocking", longTasks.totalBlockingMs, budgets.totalBlockingMs, "ms");
  checkMaximum("cart-transition", cartTransitionMs, budgets.cartTransitionMs, "ms");

  if (longTasks.maxMs > 80 && longTasks.maxMs <= budgets.singleLongTaskMs) {
    addWarning("initial-long-task", "long task is within the regression budget but above the 80ms optimization target", {
      actual: longTasks.maxMs,
      target: 80,
    });
  }

  await context.close();
  return { path: AUDIT_PATH, initial, idle, longTasks, cartTransitionMs };
}

async function auditToast(browser, baseUrl) {
  const context = await configureMeasuredContext(browser);
  const page = await context.newPage();
  await enableColdCpuProfile(context, page);
  await stubLocalApi(page, baseUrl);

  await page.goto(buildAuditUrl(baseUrl, "/categories"), { waitUntil: "domcontentloaded", timeout: 30_000 });
  await waitForStorefrontMain(page);
  const beforeAssets = await readAssetEntries(page);
  const beforeNames = beforeAssets.map((entry) => entry.name);
  const toastRuntimeLoadedBefore = beforeNames.some((name) => /StoreToasterBridge|vendor-toast/i.test(name));

  await page.getByRole("button", { name: /^筛选/ }).click();
  await page.getByText("筛选商品", { exact: true }).waitFor({ state: "visible", timeout: 10_000 });
  await page.getByPlaceholder("最低价").fill("20");
  await page.getByPlaceholder("最高价").fill("10");
  await page.getByRole("button", { name: "确认筛选" }).click();

  const toast = page.locator("[data-sonner-toast]").filter({ hasText: "最低价不能大于最高价" }).first();
  await toast.waitFor({ state: "visible", timeout: 10_000 });
  const toastBox = await toast.boundingBox();
  const toastEvents = await page.evaluate(() => window.__storefrontAuditToastEvents || []);
  const afterAssets = await readAssetEntries(page);
  const afterNames = afterAssets.map((entry) => entry.name);
  const bridgeLoadedAfter = afterNames.some((name) => /StoreToasterBridge/i.test(name));
  const toastVendorLoadedAfter = afterNames.some((name) => /vendor-toast/i.test(name));
  const validationEventSeen = toastEvents.some((event) => (
    event?.type === "error" && event?.message === "最低价不能大于最高价"
  ));

  if (toastRuntimeLoadedBefore) {
    addIssue("toast-deferral", "toast runtime loaded before any toast was requested", { files: beforeNames });
  }
  if (!bridgeLoadedAfter || !toastVendorLoadedAfter) {
    addIssue("toast-runtime", "toast runtime chunks did not load after the validation toast", {
      bridgeLoadedAfter,
      toastVendorLoadedAfter,
      files: afterNames,
    });
  }
  if (!toastBox || toastBox.width <= 0 || toastBox.height <= 0) {
    addIssue("toast-visibility", "validation toast did not have a visible browser layout box");
  }
  if (!validationEventSeen) {
    addIssue("toast-event", "validation did not emit the expected storefront toast event", { toastEvents });
  }

  await context.close();
  return {
    trigger: "categories invalid price range",
    message: "最低价不能大于最高价",
    visible: Boolean(toastBox && toastBox.width > 0 && toastBox.height > 0),
    eventSeen: validationEventSeen,
    runtimeDeferred: !toastRuntimeLoadedBefore,
    bridgeLoadedAfter,
    toastVendorLoadedAfter,
  };
}

async function main() {
  const target = await resolveBaseUrl();
  let browser;
  try {
    browser = await chromium.launch({ headless: true });
    const performance = await auditPerformance(browser, target.baseUrl);
    const toast = await auditToast(browser, target.baseUrl);
    const summary = {
      baseUrl: target.baseUrl,
      skin: AUDIT_SKIN || null,
      viewport: "390x844",
      cpuThrottleRate: CPU_THROTTLE_RATE,
      serviceWorkers: "blocked",
      budgets,
      performance,
      toast,
      warnings,
      issues,
    };
    console.log(JSON.stringify(summary, null, 2));
    if (issues.length > 0) process.exitCode = 1;
  } catch (error) {
    if (target.previewOutput.length > 0) {
      console.error(target.previewOutput.join(""));
    }
    throw error;
  } finally {
    if (browser) await browser.close();
    await stopPreview(target.preview);
  }
}

main().catch((error) => {
  console.error(`STOREFRONT_PERFORMANCE_AUDIT_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

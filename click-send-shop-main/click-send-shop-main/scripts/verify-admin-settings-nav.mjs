import { chromium } from "@playwright/test";

const BASE_URL = (process.env.BASE_URL || "").replace(/\/$/, "");
const DEFAULT_BASE_CANDIDATES = [
  "http://127.0.0.1:8080",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:4173",
  "http://127.0.0.1:4174",
];

const L = {
  settings: "\u7cfb\u7edf\u8bbe\u7f6e",
  site: "\u7ad9\u70b9\u8bbe\u7f6e",
  features: "\u529f\u80fd\u5f00\u5173",
  telegram: "Telegram \u901a\u77e5",
  shipping: "\u914d\u9001\u8bbe\u7f6e",
  auditLogs: "\u64cd\u4f5c\u65e5\u5fd7",
  dataRetention: "\u6570\u636e\u4fdd\u5b58\u4e0e\u6e05\u7406\u4e2d\u5fc3",
  backups: "\u5907\u4efd\u4e0e\u6062\u590d",
  recycleBin: "\u56de\u6536\u7ad9",
  basicInfo: "\u57fa\u7840\u4fe1\u606f",
  featureMarker: "\u5e38\u89c4\u529f\u80fd",
  auditMarker: "\u5ba1\u8ba1\u8bb0\u5f55",
  cleanupMarker: "\u6e05\u7406",
  backupMarker: "\u5907\u4efd",
  recycleMarker: "\u56de\u6536",
};

const SYSTEM_NAV_CASES = [
  { key: "site", label: L.site, path: "/admin/settings/site", marker: L.basicInfo },
  { key: "features", label: L.features, path: "/admin/settings/features", marker: L.featureMarker },
  { key: "telegram", label: L.telegram, path: "/admin/settings/telegram", marker: "Bot Token" },
  { key: "auditLogs", label: L.auditLogs, path: "/admin/audit-logs", marker: L.auditMarker },
  { key: "dataRetention", label: L.dataRetention, path: "/admin/data-retention", marker: L.cleanupMarker },
  { key: "backups", label: L.backups, path: "/admin/backups", marker: L.backupMarker },
  { key: "recycleBin", label: L.recycleBin, path: "/admin/recycle-bin", marker: L.recycleMarker },
];

const siteCapabilities = {
  mallEnabled: true,
  serviceEnabled: true,
  onlinePaymentEnabled: true,
  pointsEnabled: true,
  couponEnabled: true,
  reviewEnabled: true,
  inventoryEnabled: true,
  shippingEnabled: true,
  memberLevelEnabled: true,
  customerServiceDownloadEnabled: true,
  telegramOrderNotifyEnabled: true,
  languageGateEnabled: false,
  storefrontMultilingualEnabled: false,
  restrictedProductComplianceEnabled: true,
  trafficAnalyticsEnabled: true,
  downloadConfirmEnabled: true,
};

const siteInfo = {
  siteName: "DMT",
  siteDescription: "Admin nav verification",
  siteSlogan: "Verification",
  contactPhone: "",
  contactEmail: "",
  address: "",
  instagramUrl: "",
  facebookUrl: "",
  tiktokUrl: "",
  xhsUrl: "",
  currency: "RM",
  footerCompanyName: "DMT",
  footerCopyright: "Copyright",
  newArrivalSectionTitle: "",
  newArrivalSectionSubtitle: "",
  newArrivalDisplayCount: "8",
  newArrivalShowPrice: "1",
  newArrivalOnlyInStock: "1",
  supportDownloadConfig: "",
  supportText: "support",
  shippingNotice: "ship",
  paymentNotice: "pay",
};

const siteSettings = {
  ...siteInfo,
  logoUrl: "",
  faviconUrl: "",
  ogImageUrl: "",
  footerNav: "[]",
  privacyPolicyPath: "/privacy",
  termsPath: "/terms",
  refundPolicyPath: "/refund",
};

function api(data) {
  return { code: 0, message: "ok", data };
}

function json(data) {
  return {
    status: 200,
    contentType: "application/json",
    body: JSON.stringify(api(data)),
  };
}

function paginated(items = [], pageSize = 20) {
  return {
    items,
    total: items.length,
    page: 1,
    pageSize,
  };
}

async function pickBaseUrl() {
  if (BASE_URL) return BASE_URL;
  for (const candidate of DEFAULT_BASE_CANDIDATES) {
    try {
      const res = await fetch(`${candidate}/admin/login`, {
        redirect: "manual",
        signal: AbortSignal.timeout(2500),
      });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.includes('id="root"') || html.includes("id='root'")) return candidate;
    } catch {
      // Try next local frontend candidate.
    }
  }
  throw new Error("No local admin frontend found. Start Vite or set BASE_URL.");
}

function bootstrapAdminSession() {
  localStorage.setItem("admin_authenticated", "1");
  localStorage.setItem(
    "admin-permissions",
    JSON.stringify({ state: { permissions: [], isSuperAdmin: true }, version: 0 }),
  );
  sessionStorage.removeItem("admin.workTabs.v3");
}

async function mockAdminApis(page, baseUrl) {
  await page.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    if (!path.startsWith("/api/")) return route.continue();

    if (path === "/api/admin/events") {
      return route.fulfill({ status: 200, contentType: "text/event-stream", body: "" });
    }
    if (path === "/api/home/bootstrap") {
      return route.fulfill(json({
        siteInfo,
        siteCapabilities,
        runtimeConfig: {
          siteCode: "verify",
          siteName: "DMT",
          publicAppUrl: baseUrl,
          features: siteCapabilities,
          upload: { storage: "local", presignEnabled: false },
        },
      }));
    }
    if (path === "/api/admin/account/profile") {
      return route.fulfill(json({
        id: "admin-verify",
        username: "verify-admin",
        role: "super_admin",
        permissions: [],
        isSuperAdmin: true,
        roleCodes: ["super_admin"],
      }));
    }
    if (path === "/api/admin/settings") return route.fulfill(json(siteSettings));
    if (path === "/api/admin/settings/features") return route.fulfill(json(siteCapabilities));
    if (path === "/api/admin/settings/telegram") {
      return route.fulfill(json({
        enabled: false,
        orderNotifyEnabled: false,
        eventNotifyEnabled: false,
        eventNotifyImmediate: false,
        adminChatId: "",
        parseMode: "HTML",
        includeOrderItems: true,
        maxMessageLength: 3900,
        adminFrontendUrl: baseUrl,
        botTokenMasked: "",
        botTokenConfigured: false,
        configSource: "database",
      }));
    }
    if (path === "/api/admin/settings/telegram/logs") return route.fulfill(json([]));
    if (path === "/api/admin/settings/telegram/preview") {
      return route.fulfill(json({
        messages: ["preview"],
        totalParts: 1,
        parseMode: "HTML",
        sampleOrderNo: "ORD-VERIFY",
      }));
    }
    if (path === "/api/admin/data-retention/overview") {
      return route.fulfill(json({
        policyCount: 1,
        enabledPolicyCount: 1,
        lockedPolicyCount: 0,
        protectedTables: [],
        batchSizeRange: { min: 100, max: 5000 },
        previewTtlMinutes: 30,
        recentRuns: [],
        runningRun: null,
      }));
    }
    if (path === "/api/admin/data-retention/policies") {
      return route.fulfill(json([{
        key: "verify_policy",
        title: "Verify cleanup policy",
        description: "Synthetic policy for navigation verification",
        category: "verify",
        table_name: "verify_table",
        date_column: "created_at",
        delete_mode: "soft",
        retention_days: 30,
        default_retention_days: 30,
        min_retention_days: 1,
        batch_size: 100,
        enabled: true,
        locked: false,
        protected: false,
      }]));
    }
    if (path === "/api/admin/data-retention/runs") return route.fulfill(json(paginated([], 10)));
    if (path === "/api/admin/backups/overview") {
      return route.fulfill(json({
        latestFullBackupAt: null,
        latestIncrementalBackupAt: null,
        latestRecoverableAt: null,
        binlogHealthy: true,
        binlogDelaySeconds: 0,
        openAlertCount: 0,
        failedJobCount7d: 0,
        recentJobs: [],
        recentAlerts: [],
        recentDrills: [],
        safeguards: {},
      }));
    }
    if (path === "/api/admin/backups/health") {
      return route.fulfill(json({
        healthy: true,
        canRunFullBackup: true,
        canRunIncrementalBackup: true,
        canRunPointInTimeRestore: true,
        canUseCloudBackup: false,
        localOnly: true,
        checkedAt: new Date().toISOString(),
        checks: [],
      }));
    }
    if (path === "/api/admin/backups/files" || path === "/api/admin/restore/jobs") {
      return route.fulfill(json(paginated([], 10)));
    }
    if (path === "/api/admin/backups/alerts" || path === "/api/admin/restore/drills") {
      return route.fulfill(json([]));
    }
    if (path.includes("/audit") || path.includes("/log") || path.includes("/recycle-bin")) {
      return route.fulfill(json(paginated([], 20)));
    }
    if (path.includes("/theme/skins")) return route.fulfill(json([]));
    if (path.includes("/order-voice")) return route.fulfill(json({ enabled: false, events: [] }));

    return route.fulfill(json({ items: [], total: 0 }));
  });
}

function visibleRectMetrics(rect) {
  return rect.width > 1 && rect.height > 1;
}

function rectsOverlap(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

async function readShellMetrics(page) {
  return page.evaluate(() => {
    function rect(selector) {
      const el = document.querySelector(selector);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return {
        selector,
        left: r.left,
        right: r.right,
        top: r.top,
        bottom: r.bottom,
        width: r.width,
        height: r.height,
        visible: r.width > 1 && r.height > 1 && style.visibility !== "hidden" && style.display !== "none",
      };
    }

    return {
      viewportWidth: document.documentElement.clientWidth,
      documentScrollWidth: document.documentElement.scrollWidth,
      bodyTextLength: document.body.innerText.replace(/\s+/g, " ").trim().length,
      outletCount: document.querySelectorAll("[data-admin-outlet-path]").length,
      adminShell: rect("[data-admin-shell]"),
      sidebar: rect("[data-admin-shell] aside"),
      header: rect(".admin-chrome"),
      main: rect("main"),
    };
  });
}

function assertNoShellOverlap(metrics) {
  const issues = [];
  const overflow = metrics.documentScrollWidth - metrics.viewportWidth;
  if (overflow > 2) issues.push(`document horizontal overflow ${overflow}px`);
  if (metrics.outletCount !== 1) issues.push(`expected one admin outlet, got ${metrics.outletCount}`);
  if (!metrics.main?.visible) issues.push("main content is not visible");
  if (!metrics.header?.visible) issues.push("admin header is not visible");
  if (!metrics.sidebar?.visible) issues.push("desktop sidebar is not visible");
  if (metrics.bodyTextLength < 40) issues.push(`body text too short (${metrics.bodyTextLength})`);

  if (
    metrics.sidebar
    && metrics.main
    && visibleRectMetrics(metrics.sidebar)
    && visibleRectMetrics(metrics.main)
    && rectsOverlap(metrics.sidebar, metrics.main)
  ) {
    issues.push("sidebar overlaps main content");
  }
  if (
    metrics.header
    && metrics.main
    && visibleRectMetrics(metrics.header)
    && visibleRectMetrics(metrics.main)
    && rectsOverlap(metrics.header, metrics.main)
  ) {
    issues.push("header overlaps main content");
  }

  return issues;
}

async function readMainText(page) {
  return page.locator("main").innerText({ timeout: 8000 }).catch(() => "");
}

async function runDesktopNavCheck(page, baseUrl) {
  await page.goto(`${baseUrl}/admin/settings/site`, { waitUntil: "domcontentloaded", timeout: 30000 });
  await page.waitForSelector('[data-admin-outlet-path="/admin/settings/site"]', { timeout: 10000 });

  const sidebar = page.locator("[data-admin-shell] aside").first();
  const results = [];

  for (const item of SYSTEM_NAV_CASES) {
    const button = sidebar.getByRole("button", { name: item.label, exact: false });
    const count = await button.count();
    if (count !== 1) {
      results.push({ ...item, ok: false, error: `expected one sidebar button, got ${count}` });
      continue;
    }

    await button.click();
    await page.waitForURL(`${baseUrl}${item.path}`, { timeout: 10000 });
    await page.waitForSelector(`[data-admin-outlet-path="${item.path}"]`, { timeout: 10000 });
    await page.waitForTimeout(500);

    const mainText = await readMainText(page);
    const metrics = await readShellMetrics(page);
    const overlapIssues = assertNoShellOverlap(metrics);
    const markerOk = mainText.includes(item.marker);
    const outletPath = await page.locator("[data-admin-outlet-path]").getAttribute("data-admin-outlet-path");

    results.push({
      key: item.key,
      path: item.path,
      url: new URL(page.url()).pathname,
      outletPath,
      markerOk,
      overlapIssues,
      ok: markerOk && outletPath === item.path && overlapIssues.length === 0,
      mainTextStart: mainText.replace(/\s+/g, " ").slice(0, 120),
    });
  }

  return results;
}

async function main() {
  const baseUrl = await pickBaseUrl();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await context.addInitScript(bootstrapAdminSession);
  const page = await context.newPage();
  const runtimeErrors = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") runtimeErrors.push(msg.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));

  await mockAdminApis(page, baseUrl);
  const results = await runDesktopNavCheck(page, baseUrl);
  await browser.close();

  const seriousRuntimeErrors = runtimeErrors.filter((text) => (
    !text.includes("controlled input")
    && !text.includes("EventSource")
  ));
  const failures = results.filter((item) => !item.ok);
  const report = {
    baseUrl,
    summary: {
      total: results.length,
      failures: failures.length,
      runtimeErrors: seriousRuntimeErrors.length,
    },
    results,
    runtimeErrors: seriousRuntimeErrors,
  };

  console.log(JSON.stringify(report, null, 2));
  if (failures.length || seriousRuntimeErrors.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`ADMIN_SETTINGS_NAV_VERIFY_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

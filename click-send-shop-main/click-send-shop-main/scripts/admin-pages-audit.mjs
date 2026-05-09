/**
 * Headless crawl of /admin/* routes (API login + localStorage bootstrap).
 * Usage: node scripts/admin-pages-audit.mjs
 * Env: BASE_URL (optional), API_ORIGIN (optional, default http://127.0.0.1:3000), ADMIN_PHONE, ADMIN_PASSWORD
 */
import { chromium } from "@playwright/test";

const ADMIN_PHONE = process.env.ADMIN_PHONE || "18800000001";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123456";

const PATHS = [
  "/admin",
  "/admin/products",
  "/admin/categories",
  "/admin/tags",
  "/admin/orders",
  "/admin/payments/channels",
  "/admin/payments/orders",
  "/admin/payments/events",
  "/admin/payments/reconciliations",
  "/admin/returns",
  "/admin/reviews",
  "/admin/users",
  "/admin/invites",
  "/admin/rewards",
  "/admin/points/records",
  "/admin/coupons",
  "/admin/coupons/new",
  "/admin/coupons/records",
  "/admin/notifications",
  "/admin/banners",
  "/admin/reports",
  "/admin/exports",
  "/admin/settings/site",
  "/admin/settings/theme",
  "/admin/settings/shipping",
  "/admin/settings/points",
  "/admin/settings/referral",
  "/admin/account",
  "/admin/content",
  "/admin/logs",
  "/admin/settings/roles",
  "/admin/accounts",
  "/admin/recycle-bin",
];

async function pickBase() {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, "");
  /** Prefer ports where SPA serves /admin/login (same index.html), not a random 200 on /. */
  for (const port of [8081, 8080, 5173]) {
    const u = `http://127.0.0.1:${port}`;
    try {
      const r = await fetch(`${u}/admin/login`, { redirect: "manual", signal: AbortSignal.timeout(3000) });
      if (!r.ok) continue;
      const html = await r.text();
      if (html.includes('id="root"') || html.includes("id='root'")) return u;
    } catch {
      /* try next */
    }
  }
  throw new Error("No Vite dev server (8081/8080/5173) serving /admin/login; set BASE_URL");
}

async function apiAdminLogin() {
  const apiOrigin = (process.env.API_ORIGIN || "http://127.0.0.1:3000").replace(/\/$/, "");
  const url = `${apiOrigin}/api/admin/auth/login`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || j.code !== 0) throw new Error(j.message || `admin login ${r.status}`);
  const d = j.data;
  const access = d.token?.accessToken || "";
  const refresh = d.token?.refreshToken || "";
  const permissions = d.permissions || [];
  const isSuperAdmin = !!d.isSuperAdmin;
  return { access, refresh, permissions, isSuperAdmin };
}

/** Match zustand `persist` + `partialize` in useAdminPermissionStore */
function bootstrapAdminSessionScript(payload) {
  const { access, refresh, permissions, isSuperAdmin } = payload;
  localStorage.setItem("admin_access_token", access);
  localStorage.setItem("admin_refresh_token", refresh);
  localStorage.setItem("admin_authenticated", "1");
  localStorage.setItem(
    "admin-permissions",
    JSON.stringify({ state: { permissions, isSuperAdmin }, version: 0 }),
  );
}

async function main() {
  const base = await pickBase();
  const session = await apiAdminLogin();
  console.error(`Using BASE_URL=${base}`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await context.addInitScript(bootstrapAdminSessionScript, session);
  const page = await context.newPage();

  const consoleErrors = [];
  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push({ path: null, text: msg.text() });
  });
  page.on("pageerror", (err) => {
    consoleErrors.push({ path: null, text: err.message });
  });

  const results = [];
  for (const path of PATHS) {
    const before = consoleErrors.length;
    await page.goto(`${base}${path}`, { waitUntil: "domcontentloaded", timeout: 90000 }).catch((e) => {
      results.push({ path, ok: false, error: e.message, url: page.url() });
    });
    if (results.at(-1)?.path === path && results.at(-1)?.error) continue;

    await page.waitForTimeout(900);
    const url = page.url();
    const pathname = new URL(url).pathname;
    const text = (await page.locator("body").innerText().catch(() => "")) || "";
    const trimmed = text.replace(/\s+/g, " ").trim();
    const newErrors = consoleErrors.slice(before).map((e) => e.text);

    const onLogin = pathname.includes("/admin/login");
    const suspicious =
      onLogin ||
      trimmed.length < 30 ||
      /无权限|403|加载失败|Something went wrong|Error:/i.test(trimmed);

    results.push({
      path,
      url: pathname,
      ok: !suspicious,
      textLen: trimmed.length,
      consoleErrors: newErrors,
    });
  }

  await browser.close();

  const issues = results.filter((r) => !r.ok || (r.consoleErrors && r.consoleErrors.length));
  console.log(JSON.stringify({ base, summary: { total: results.length, issues: issues.length }, results, issues }, null, 2));
  if (issues.some((i) => !i.ok)) process.exitCode = 1;
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

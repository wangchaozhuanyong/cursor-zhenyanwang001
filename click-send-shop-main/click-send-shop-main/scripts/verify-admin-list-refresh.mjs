/**
 * 验证后台「表单保存后返回列表」是否自动刷新（商品 / 活动 / 优惠券）。
 * 依赖：本地前端 http://127.0.0.1:8082、后端 http://127.0.0.1:3002
 */
import { execSync } from "node:child_process";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://127.0.0.1:8082";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "18800000001";
const ADMIN_PASSWORD = requireEnv("ADMIN_PASSWORD");
const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../server");

function requireEnv(name) {
  const value = String(process.env[name] || "").trim();
  if (!value) throw new Error(`Missing ${name} env; do not use hardcoded admin credentials.`);
  return value;
}

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function base32ToBuffer(input) {
  const clean = String(input || "").replace(/=+$/g, "").replace(/\s+/g, "").toUpperCase();
  let bits = "";
  for (const ch of clean) {
    const idx = ALPHABET.indexOf(ch);
    if (idx < 0) continue;
    bits += idx.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return Buffer.from(bytes);
}

function hotp(secretBase32, counter, digits = 6) {
  const key = base32ToBuffer(secretBase32);
  const buf = Buffer.alloc(8);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  buf.writeUInt32BE(high, 0);
  buf.writeUInt32BE(low, 4);
  const hmac = crypto.createHmac("sha1", key).update(buf).digest();
  const offset = hmac[hmac.length - 1] & 0x0f;
  const binary = ((hmac[offset] & 0x7f) << 24)
    | ((hmac[offset + 1] & 0xff) << 16)
    | ((hmac[offset + 2] & 0xff) << 8)
    | (hmac[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, "0");
}

function currentTotp(secretBase32) {
  const step = 30;
  const counter = Math.floor(Date.now() / 1000 / step);
  return hotp(secretBase32, counter);
}

async function resetAdminMfa() {
  execSync(`node scripts/reset-admin-mfa.js ${ADMIN_PHONE}`, {
    cwd: SERVER_DIR,
    stdio: "inherit",
  });
}

async function loginAdmin(page) {
  let setupSecret = "";
  page.on("response", async (response) => {
    if (!response.url().includes("/api/admin/auth/login") || response.request().method() !== "POST") return;
    try {
      const json = await response.json();
      if (json?.data?.secret) setupSecret = json.data.secret;
    } catch {
      // ignore
    }
  });

  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("输入账号").fill(ADMIN_PHONE);
  await page.getByPlaceholder("输入密码").fill(ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();

  const mfaInput = page.locator('input[inputmode="numeric"]');
  await mfaInput.waitFor({ state: "visible", timeout: 15000 }).catch(() => null);

  if (await mfaInput.isVisible().catch(() => false)) {
    const secretFromDom = (await page.locator("code").first().textContent().catch(() => ""))?.trim();
    const secret = setupSecret || secretFromDom;
    if (!secret) throw new Error("无法获取 MFA 密钥，请检查管理员登录流程");
    await mfaInput.fill(currentTotp(secret));
    await page.getByRole("button", { name: /核实并输入|Verify and enter/i }).click();
  }

  await page.waitForURL((url) => !url.pathname.includes("/admin/login"), { timeout: 20000 });
}

async function verifyProductListRefresh(page) {
  const name = `E2E商品刷新-${Date.now()}`;
  await page.goto(`${BASE}/admin/products`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/admin/products/new`, { waitUntil: "networkidle" });
  await page.getByPlaceholder("输入商品名称").fill(name);
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await page.waitForURL("**/admin/products", { timeout: 30000 });
  await page.getByText(name, { exact: false }).first().waitFor({ state: "visible", timeout: 15000 });
  console.log(`✅ 商品列表：保存后返回可见「${name}」`);
}

async function fillSegmentedDateTime(page, index, parts) {
  const { y, m, d, h, mi } = parts;
  await page.getByLabel(/年（4 位）/).nth(index).fill(y);
  await page.getByLabel(/月（2 位）/).nth(index).fill(m);
  await page.getByLabel(/日（2 位）/).nth(index).fill(d);
  await page.getByLabel(/时（0–23，2 位）|时（0-23，2 位）/).nth(index).fill(h);
  await page.getByLabel(/分（0–59，2 位）|分（0-59，2 位）/).nth(index).fill(mi);
  await page.getByLabel(/分（0–59，2 位）|分（0-59，2 位）/).nth(index).blur();
}

async function confirmSaveDialog(page) {
  const dialog = page.getByRole("dialog");
  await dialog.waitFor({ state: "visible", timeout: 10000 });
  await dialog.getByRole("button", { name: "保存", exact: true }).click();
}

async function verifyActivityListRefresh(page) {
  const title = `E2E活动刷新-${Date.now()}`;
  await page.goto(`${BASE}/admin/marketing/activities`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/admin/marketing/activities/new?type=full_reduction`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "下一步" }).click();
  await page.locator('input[maxlength="60"]').waitFor({ state: "visible", timeout: 15000 });
  await page.locator('input[maxlength="60"]').fill(title);
  await fillSegmentedDateTime(page, 0, { y: "2026", m: "5", d: "27", h: "10", mi: "0" });
  await fillSegmentedDateTime(page, 1, { y: "2026", m: "6", d: "27", h: "10", mi: "0" });
  await page.getByRole("button", { name: "保存草稿" }).click();
  await page.waitForURL("**/admin/marketing/activities", { timeout: 30000 });
  await page.getByText(title, { exact: false }).first().waitFor({ state: "visible", timeout: 15000 });
  console.log(`✅ 活动列表：保存后返回可见「${title}」`);
}

async function verifyCouponListRefresh(page) {
  const title = `E2E优惠券刷新-${Date.now()}`;
  const code = `E2E${Date.now().toString().slice(-8)}`;
  await page.goto(`${BASE}/admin/marketing/coupons`, { waitUntil: "networkidle" });
  await page.goto(`${BASE}/admin/marketing/coupons/new`, { waitUntil: "networkidle" });
  const formInputs = page.locator(".max-w-2xl input").filter({ hasNot: page.locator('[type="checkbox"]') });
  await formInputs.nth(0).fill(title);
  await formInputs.nth(1).fill(code);
  await formInputs.nth(2).fill("10");
  await page.getByRole("button", { name: "保存", exact: true }).click();
  await confirmSaveDialog(page);
  await page.waitForURL("**/admin/marketing/coupons", { timeout: 30000 });
  await page.getByPlaceholder("搜索标题/编码").fill(title);
  await page.locator("table tbody tr").filter({ hasText: title }).first().waitFor({ state: "visible", timeout: 15000 });
  console.log(`✅ 优惠券列表：保存后返回可见「${title}」`);
}

async function main() {
  console.log("重置管理员 MFA（仅本地联调）...");
  await resetAdminMfa();

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  const results = [];
  try {
    await loginAdmin(page);
    for (const task of [
      { name: "商品", run: () => verifyProductListRefresh(page) },
      { name: "活动", run: () => verifyActivityListRefresh(page) },
      { name: "优惠券", run: () => verifyCouponListRefresh(page) },
    ]) {
      try {
        await task.run();
        results.push({ name: task.name, ok: true });
      } catch (error) {
        results.push({ name: task.name, ok: false, error: error?.message || String(error) });
        console.error(`❌ ${task.name}列表验证失败:`, error?.message || error);
      }
    }
    const failed = results.filter((item) => !item.ok);
    if (failed.length) {
      throw new Error(failed.map((item) => `${item.name}: ${item.error}`).join("; "));
    }
    console.log("\n全部列表刷新验证通过。");
  } finally {
    await browser.close();
  }
}

main().catch((error) => {
  console.error("\n验证失败:", error?.message || error);
  process.exit(1);
});

import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "http://13.212.179.213";
const API = `${BASE}/api`;
const ADMIN_PHONE = process.env.ADMIN_PHONE || "18800000001";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123456";

function nowStamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function randomPhone() {
  return `1${Date.now().toString().slice(-7)}${Math.floor(Math.random() * 900 + 100)}`.slice(0, 11);
}

async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 0) {
    throw new Error(`${options.method || "GET"} ${url} -> ${body.message || res.status}`);
  }
  return body.data;
}

async function registerAndLogin(prefix) {
  const phone = randomPhone();
  const password = "ShotFlow123A";
  await jfetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password, nickname: `${prefix}-${phone.slice(-4)}` }),
  });
  const login = await jfetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  return { phone, password, token: login.token?.accessToken || login.token };
}

async function authGet(pathname, token) {
  return jfetch(`${API}${pathname}`, { headers: { Authorization: `Bearer ${token}` } });
}

async function authPost(pathname, token, payload) {
  return jfetch(`${API}${pathname}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function authPut(pathname, token, payload) {
  return jfetch(`${API}${pathname}`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function seedFlow() {
  const inviter = await registerAndLogin("截图邀请人");
  const inviterProfile = await authGet("/auth/profile", inviter.token);
  const inviteCode = inviterProfile.inviteCode || inviterProfile.invite_code;

  const invitee = await registerAndLogin("截图被邀请人");
  await authPost("/invite/bind", invitee.token, { inviteCode });
  await authPost("/addresses", invitee.token, {
    name: "截图测试收件人",
    phone: "13933334444",
    address: "吉隆坡截图流程地址",
    isDefault: true,
  });

  const products = await jfetch(`${API}/products?page=1&pageSize=20`);
  const product = products.list?.[0];
  if (!product) throw new Error("没有可下单商品");
  await authPost("/cart", invitee.token, { productId: product.id, qty: 1 });
  const order = await authPost("/orders", invitee.token, {
    items: [{ product_id: product.id, qty: 1 }],
    contact_name: "截图流程用户",
    contact_phone: invitee.phone,
    address: "吉隆坡截图流程地址",
    payment_method: "mock",
    note: "截图回归订单",
  });

  const adminLogin = await jfetch(`${API}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  const adminToken = typeof adminLogin.token === "string" ? adminLogin.token : adminLogin.token?.accessToken;

  await authPut(`/admin/orders/${order.id}/status`, adminToken, { status: "paid" });
  await authPut(`/admin/orders/${order.id}/status`, adminToken, { status: "shipped" });
  await authPut(`/admin/orders/${order.id}/status`, adminToken, { status: "completed" });

  await authPost("/reviews", invitee.token, {
    product_id: product.id,
    rating: 5,
    content: "截图回归评价：流程正常。",
    images: [],
  });

  const stats = await authGet("/invite/stats", inviter.token);
  const records = await authGet("/invite/records?page=1&pageSize=20", inviter.token);

  return {
    inviter,
    invitee,
    inviteCode,
    orderId: order.id,
    productId: product.id,
    inviteStats: stats,
    inviteRecordsCount: records.total || records.list?.length || 0,
  };
}

async function loginFrontend(page, phone, password) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="手机号"]', phone);
  await page.fill('input[placeholder="密码"]', password);
  await page.locator("button").filter({ hasText: /^登 录$/ }).nth(1).click();
  await page.waitForTimeout(1200);
}

async function loginAdmin(page, phone, password) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="输入账号"]', phone);
  await page.fill('input[placeholder="输入密码"]', password);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(1500);
}

async function captureScreens(summary, outDir) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "01-home.png"), fullPage: true });

  await loginFrontend(page, summary.inviter.phone, summary.inviter.password);
  await page.goto(`${BASE}/invite`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "02-invite-center-inviter.png"), fullPage: true });

  await page.goto(`${BASE}/orders`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "03-orders-inviter.png"), fullPage: true });

  await context.clearCookies();
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await loginFrontend(page, summary.invitee.phone, summary.invitee.password);
  await page.goto(`${BASE}/orders`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "04-orders-invitee.png"), fullPage: true });

  await page.goto(`${BASE}/profile`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "05-profile-invitee.png"), fullPage: true });

  await loginAdmin(page, ADMIN_PHONE, ADMIN_PASSWORD);
  await page.goto(`${BASE}/admin/invites`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "06-admin-invites.png"), fullPage: true });

  await page.goto(`${BASE}/admin/orders`, { waitUntil: "networkidle" });
  await page.screenshot({ path: path.join(outDir, "07-admin-orders.png"), fullPage: true });

  await browser.close();
}

async function main() {
  const stamp = nowStamp();
  const root = path.resolve(process.cwd(), "artifacts", `regression-${stamp}`);
  fs.mkdirSync(root, { recursive: true });

  const flow = await seedFlow();
  await captureScreens(flow, root);

  const summary = {
    base: BASE,
    generatedAt: new Date().toISOString(),
    accounts: {
      admin: { phone: ADMIN_PHONE, password: ADMIN_PASSWORD },
      inviter: { phone: flow.inviter.phone, password: flow.inviter.password, inviteCode: flow.inviteCode },
      invitee: { phone: flow.invitee.phone, password: flow.invitee.password },
    },
    data: {
      orderId: flow.orderId,
      productId: flow.productId,
      inviteStats: flow.inviteStats,
      inviteRecordsCount: flow.inviteRecordsCount,
    },
    screenshots: fs.readdirSync(root).filter((x) => x.endsWith(".png")).sort(),
  };
  fs.writeFileSync(path.join(root, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify({ artifactDir: root, ...summary }, null, 2));
}

main().catch((e) => {
  console.error(`REGRESSION_FAILED: ${e.message}`);
  process.exit(1);
});


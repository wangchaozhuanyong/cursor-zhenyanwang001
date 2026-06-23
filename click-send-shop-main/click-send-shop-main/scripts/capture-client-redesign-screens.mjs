import fs from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";
import sharp from "sharp";

const BASE = (process.env.BASE_URL || "http://127.0.0.1:8080").replace(/\/$/, "");
const API = process.env.API_BASE_URL
  ? `${process.env.API_BASE_URL.replace(/\/$/, "")}/api`
  : `${BASE}/api`;
const VIEWPORT = parseViewport(process.env.VIEWPORT || "390x844");
const WAIT_MS = Number(process.env.CAPTURE_WAIT_MS || 900);

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

function parseViewport(value) {
  const [width, height] = value.split("x").map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Invalid VIEWPORT: ${value}`);
  }
  return { width, height, label: value };
}

function safeSegment(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
}

async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 0) {
    throw new Error(`${options.method || "GET"} ${url} -> ${body.message || res.status}`);
  }
  return body.data;
}

async function isApiAvailable() {
  try {
    const res = await fetch(`${API}/health/live`);
    const body = await res.json().catch(() => ({}));
    return res.ok && body.code === 0;
  } catch {
    return false;
  }
}

function randomPhone() {
  const tail = `${Date.now()}${Math.floor(Math.random() * 1000)}`.replace(/\D/g, "").slice(-8);
  return `01${tail}`.slice(0, 10);
}

async function registerUser() {
  const phone = randomPhone();
  const password = "VisualAudit1A";
  const countryCode = "+60";
  await jfetch(`${API}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, countryCode, password, nickname: `visual-${phone.slice(-4)}` }),
  });
  const login = await jfetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, countryCode, password }),
  });
  return {
    phone,
    password,
    countryCode,
    token: login.token?.accessToken || login.token,
  };
}

async function authPost(pathname, token, payload) {
  return jfetch(`${API}${pathname}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

async function seedProduct(token) {
  const products = await jfetch(`${API}/products?page=1&pageSize=20`);
  const product = products?.list?.find((item) => item?.id) || null;
  if (!product?.id) return null;
  await authPost("/cart", token, { productId: product.id, qty: 1 });
  return product;
}

async function createAddress(token, phone) {
  try {
    return await authPost("/addresses", token, {
      name: "Visual Audit",
      phone,
      address: "Kuala Lumpur visual audit address",
      isDefault: true,
    });
  } catch {
    return null;
  }
}

async function createOrder(token, product, phone) {
  if (!product?.id) return null;
  try {
    return await authPost("/orders", token, {
      items: [{ product_id: product.id, qty: 1 }],
      contact_name: "Visual Audit",
      contact_phone: phone,
      address: "Kuala Lumpur visual audit address",
      payment_method: "mock",
      note: "client visual audit order",
    });
  } catch {
    return null;
  }
}

async function firstPromotionSlug() {
  try {
    const data = await jfetch(`${API}/marketing/promotions?page=1&pageSize=1`);
    return data?.list?.[0]?.slug || "";
  } catch {
    return "";
  }
}

async function loginFrontend(page, user) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#root", { timeout: 12000 });
  await page.waitForTimeout(WAIT_MS);
  const phoneInput = page.locator("#auth-phone, input[type='tel']").first();
  const passwordInput = page.locator("#auth-password, input[type='password']").first();
  if ((await phoneInput.count()) === 0 || (await passwordInput.count()) === 0) return false;
  await phoneInput.fill(user.phone);
  await passwordInput.fill(user.password);
  const submit = page.locator("form .auth-login-submit, form button[type='submit']").first();
  if ((await submit.count()) === 0) return false;
  await submit.click();
  await page.waitForTimeout(1600);
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForTimeout(WAIT_MS);
  return !page.url().includes("/login");
}

function routePlan({ productId, promotionSlug, orderId }) {
  const productPath = productId ? `/product/${productId}` : "/product/v10-smoke-product-flash";
  const promotionPath = promotionSlug ? `/promotions/${promotionSlug}` : "/promotions/smoke-slug";
  const orderPath = orderId ? `/orders/${orderId}` : "/orders/SMOKE";
  return [
    ["01-home", "/", "guest"],
    ["02-categories", "/categories", "guest"],
    ["03-search", "/search", "guest"],
    ["04-products", "/categories?is_new=1&home_new_arrivals_rule=1", "guest"],
    ["05-product-detail", productPath, "guest"],
    ["06-cart", "/cart", "auth"],
    ["07-checkout", "/checkout", "auth"],
    ["08-payment-result", orderId ? `/payment/result?order_no=${encodeURIComponent(orderId)}` : "/payment/result?order_no=SMOKE", "auth"],
    ["09-orders", "/orders", "auth"],
    ["10-order-detail", orderPath, "auth"],
    ["11-coupons", "/coupons", "auth"],
    ["12-promotions", "/promotions", "guest"],
    ["13-profile", "/profile", "auth"],
    ["14-address", "/address", "auth"],
    ["15-favorites", "/favorites", "auth"],
    ["16-notifications", "/notifications", "auth"],
    ["17-help", "/help", "guest"],
    ["18-login", "/login", "guest"],
    ["18-register", "/register", "guest"],
    ["19-invite", "/invite", "auth"],
    ["20-forgot-password", "/forgot-password", "guest"],
    ["21-bind-phone", "/login/bind-phone", "guest"],
    ["22-support-download", "/support-download", "guest"],
    ["23-install", "/install", "guest"],
    ["24-about", "/about", "guest"],
    ["25-delivery", "/delivery", "guest"],
    ["26-feature-status", "/feature-status", "guest"],
    ["27-feedback", "/feedback", "auth"],
    ["28-content-contact-us", "/content/contact-us", "guest"],
    ["29-settings", "/settings", "auth"],
    ["30-order-logistics", `${orderPath}/logistics`, "auth"],
    ["31-points", "/points", "auth"],
    ["32-points-gifts", "/points/gifts", "auth"],
    ["33-rewards", "/rewards", "auth"],
    ["34-wallet", "/wallet", "auth"],
    ["35-returns", "/returns", "auth"],
    ["36-return-detail", "/returns/SMOKE", "auth"],
    ["37-pending-reviews", "/reviews/pending", "auth"],
    ["38-history", "/history", "auth"],
    ["39-promotion-detail", promotionPath, "guest"],
    ["40-tiktok", "/tiktok", "guest"],
  ].map(([id, pathname, mode]) => ({ id, pathname, mode }));
}

async function captureRoute(page, route, outDir) {
  const response = await page.goto(`${BASE}${route.pathname}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  await page.waitForSelector("#root", { timeout: 12000 }).catch(() => undefined);
  await page.waitForTimeout(WAIT_MS);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
  const state = await page.evaluate(() => {
    const root = document.querySelector("#root");
    const bodyText = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
    const doc = document.documentElement;
    return {
      href: location.href,
      title: document.title,
      rootChars: (root?.textContent || "").replace(/\s+/g, " ").trim().length,
      bodySample: bodyText.slice(0, 180),
      horizontalOverflow: Math.max(0, doc.scrollWidth - doc.clientWidth),
    };
  });
  const file = `${route.id}-${safeSegment(route.mode)}.png`;
  await page.screenshot({ path: path.join(outDir, file), fullPage: true });
  return {
    id: route.id,
    path: route.pathname,
    mode: route.mode,
    status: response?.status() ?? -1,
    file,
    ...state,
  };
}

async function makeContactSheet(outDir, captures) {
  const thumbWidth = 180;
  const thumbHeight = 390;
  const labelHeight = 34;
  const gap = 14;
  const cols = 5;
  const rows = Math.ceil(captures.length / cols);
  const sheetWidth = cols * thumbWidth + (cols + 1) * gap;
  const sheetHeight = rows * (thumbHeight + labelHeight + gap) + gap;
  const composites = [];

  for (let index = 0; index < captures.length; index += 1) {
    const capture = captures[index];
    const input = path.join(outDir, capture.file);
    const meta = await sharp(input).metadata();
    const sourceWidth = meta.width || thumbWidth;
    const sourceHeight = meta.height || thumbHeight;
    const resizedHeight = Math.round((sourceHeight * thumbWidth) / sourceWidth);
    const base = sharp(input).resize({ width: thumbWidth });
    let thumb = base;
    if (resizedHeight >= thumbHeight) {
      thumb = thumb.extract({ left: 0, top: 0, width: thumbWidth, height: thumbHeight });
    } else {
      thumb = thumb.extend({
        bottom: thumbHeight - resizedHeight,
        background: "#f4f5f2",
      });
    }
    const thumbBuffer = await thumb.png().toBuffer();
    const label = Buffer.from(`
      <svg width="${thumbWidth}" height="${labelHeight}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="#111814"/>
        <text x="8" y="14" font-family="Arial, sans-serif" font-size="10" fill="#f4f5f2" font-weight="700">${capture.id}</text>
        <text x="8" y="28" font-family="Arial, sans-serif" font-size="9" fill="#bcc7bd">${capture.path.replace(/&/g, "&amp;").slice(0, 32)}</text>
      </svg>
    `);
    const col = index % cols;
    const row = Math.floor(index / cols);
    const left = gap + col * (thumbWidth + gap);
    const top = gap + row * (thumbHeight + labelHeight + gap);
    composites.push({ input: thumbBuffer, left, top });
    composites.push({ input: label, left, top: top + thumbHeight });
  }

  await sharp({
    create: {
      width: sheetWidth,
      height: sheetHeight,
      channels: 4,
      background: "#e8ece7",
    },
  })
    .composite(composites)
    .png()
    .toFile(path.join(outDir, "contact-sheet.png"));
}

async function main() {
  const outDir = path.resolve(process.cwd(), process.env.OUT_DIR || path.join("artifacts", `client-redesign-visual-${stamp()}`));
  await fs.mkdir(outDir, { recursive: true });

  const apiAvailable = await isApiAvailable();
  let user = null;
  let product = null;
  let order = null;
  let promotionSlug = "";
  let authReady = false;
  let cartSeeded = false;

  if (apiAvailable) {
    try {
      user = await registerUser();
      product = await seedProduct(user.token);
      cartSeeded = Boolean(product?.id);
      await createAddress(user.token, user.phone);
      promotionSlug = await firstPromotionSlug();
    } catch {
      user = null;
    }
  }

  const browser = await chromium.launch({ headless: true });
  const guestContext = await browser.newContext({ viewport: VIEWPORT, locale: "zh-CN", ignoreHTTPSErrors: true });
  const authContext = await browser.newContext({ viewport: VIEWPORT, locale: "zh-CN", ignoreHTTPSErrors: true });
  const guestPage = await guestContext.newPage();
  const authPage = await authContext.newPage();

  if (user) {
    authReady = await loginFrontend(authPage, user);
    if (authReady && product) {
      order = await createOrder(user.token, product, user.phone);
      await seedProduct(user.token).catch(() => undefined);
    }
  }

  const routes = routePlan({
    productId: product?.id || "",
    promotionSlug,
    orderId: order?.id || "",
  });
  const captures = [];
  for (const route of routes) {
    const page = route.mode === "auth" && authReady ? authPage : guestPage;
    captures.push(await captureRoute(page, route, outDir));
  }

  await makeContactSheet(outDir, captures);
  await guestContext.close();
  await authContext.close();
  await browser.close();

  const summary = {
    base: BASE,
    api: API,
    generatedAt: new Date().toISOString(),
    viewport: VIEWPORT.label,
    apiAvailable,
    authReady,
    cartSeeded,
    orderCreated: Boolean(order?.id),
    productId: product?.id || "",
    orderId: order?.id || "",
    promotionSlug,
    outputDir: outDir,
    contactSheet: path.join(outDir, "contact-sheet.png"),
    captures,
  };
  await fs.writeFile(path.join(outDir, "summary.json"), JSON.stringify(summary, null, 2));
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(`CAPTURE_CLIENT_REDESIGN_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

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
const ADMIN_PHONE = process.env.ADMIN_PHONE || "18800000001";
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();
const ADMIN_REQUEST_ORIGIN = new URL(BASE).origin;

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
  const token = login.token?.accessToken || login.token;
  const profile = token
    ? await jfetch(`${API}/user/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => null)
    : null;
  return {
    phone,
    password,
    countryCode,
    token,
    profile,
  };
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

async function adminPut(pathname, admin, payload) {
  const headers = {
    Authorization: `Bearer ${admin.token}`,
    "Content-Type": "application/json",
    Origin: ADMIN_REQUEST_ORIGIN,
    Referer: `${ADMIN_REQUEST_ORIGIN}/admin`,
  };
  if (admin.csrfToken) {
    headers["X-CSRF-Token"] = admin.csrfToken;
    headers.Cookie = `admin_csrf_token=${encodeURIComponent(admin.csrfToken)}`;
  }
  return jfetch(`${API}${pathname}`, {
    method: "PUT",
    headers,
    body: JSON.stringify(payload),
  });
}

async function authGet(pathname, token) {
  return jfetch(`${API}${pathname}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

async function loginAdminForVisualSeed() {
  if (!ADMIN_PASSWORD) {
    return {
      token: "",
      error: "ADMIN_PASSWORD env is missing; skipped admin order status transition for return-detail data state",
    };
  }
  try {
    const login = await jfetch(`${API}/admin/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: ADMIN_REQUEST_ORIGIN, Referer: `${ADMIN_REQUEST_ORIGIN}/admin/login` },
      body: JSON.stringify({ phone: ADMIN_PHONE, username: ADMIN_PHONE, password: ADMIN_PASSWORD }),
    });
    const token = typeof login?.token === "string" ? login.token : login?.token?.accessToken;
    const csrfToken = String(login?.csrfToken || "");
    return token
      ? { token, csrfToken, error: "" }
      : { token: "", csrfToken: "", error: "admin login did not return a token; skipped return-detail data-state seed" };
  } catch (error) {
    return {
      token: "",
      csrfToken: "",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function prepareOrderForReturnDetailSeed(orderId) {
  if (!orderId) {
    return { ok: false, error: "missing order id for return-detail data-state seed" };
  }
  const admin = await loginAdminForVisualSeed();
  if (!admin.token) return { ok: false, error: admin.error };
  try {
    for (const status of ["paid", "shipped", "completed"]) {
      await adminPut(`/admin/orders/${encodeURIComponent(orderId)}/status`, admin, {
        status,
        remark: "client visual audit return-detail seed",
      });
    }
    return { ok: true, error: "" };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function seedProduct(token) {
  const products = await jfetch(`${API}/products?page=1&pageSize=20`);
  const candidates = Array.isArray(products?.list)
    ? products.list.filter((item) => item?.id)
    : [];
  for (const product of candidates) {
    try {
      await authPost("/cart", token, { productId: product.id, qty: 1 });
      return { product, cartSeeded: true };
    } catch {
      // Some live data has a stock number but no purchasable default SKU.
      // Keep looking so the visual audit can still exercise checkout routes.
    }
  }
  return { product: candidates[0] || null, cartSeeded: false };
}

async function createAddress(token, phone) {
  const addressPayload = {
    recipient_name: "Visual Audit",
    phone,
    line1: "Jalan Sultan Ismail 1",
    line2: "Unit Visual Audit",
    city: "Kuala Lumpur",
    state: "Kuala Lumpur",
    postcode: "50250",
    country: "MY",
  };
  try {
    return await authPost("/addresses", token, {
      name: addressPayload.recipient_name,
      phone: addressPayload.phone,
      address: `__MYADDR_V1__:${JSON.stringify(addressPayload)}`,
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

async function fetchOrder(token, orderId) {
  if (!orderId) return null;
  try {
    return await authGet(`/orders/${encodeURIComponent(orderId)}`, token);
  } catch {
    return null;
  }
}

async function seedHistory(token, product) {
  if (!product?.id) return false;
  try {
    await authPost("/history", token, { product_id: product.id });
    return true;
  } catch {
    return false;
  }
}

async function firstReturnForUser(token) {
  const data = await authGet("/returns?page=1&pageSize=1", token);
  return Array.isArray(data?.list) ? data.list[0] || null : null;
}

async function seedReturnRequest(token, order, phone) {
  const orderItem = Array.isArray(order?.items)
    ? order.items.find((item) => item?.order_item_id)
    : null;
  if (!order?.id || !orderItem?.order_item_id) {
    return { returnRequest: null, error: "missing order item for return request" };
  }
  try {
    const returnRequest = await authPost("/returns", token, {
      order_id: order.id,
      order_item_id: orderItem.order_item_id,
      quantity: 1,
      type: "refund",
      reason: "视觉验收售后申请",
      description: "用于客户端售后详情页面视觉验收。",
      images: [],
      proof_images: [],
      contact_phone: phone,
    });
    return { returnRequest, error: "" };
  } catch (error) {
    const existing = await firstReturnForUser(token).catch(() => null);
    return {
      returnRequest: existing,
      error: error instanceof Error ? error.message : String(error),
    };
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

function buildUserStorageValue(profile) {
  if (!profile || typeof profile !== "object") return "";
  const d = profile;
  return JSON.stringify({
    state: {
      nickname: d.nickname || "用户",
      avatar: d.avatar || "",
      phone: d.phone || "",
      wechat: d.wechat || "",
      whatsapp: d.whatsapp || "",
      birthday: d.birthday || null,
      birthdayLocked: d.birthdayLocked ?? d.birthday_locked ?? false,
      inviteCode: d.inviteCode || d.invite_code || "",
      parentInviteCode: d.parentInviteCode || d.parent_invite_code || "",
      pointsBalance: Number(d.pointsBalance ?? d.points_balance ?? 0),
      memberLevel: d.memberLevel || d.member_level || null,
      addresses: [],
      subordinateEnabled: Boolean(d.subordinateEnabled ?? d.subordinate_enabled ?? false),
    },
    version: 0,
  });
}

async function loginFrontend(page, user) {
  await installFrontendAuthHint(page.context(), page);
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
  await page.waitForTimeout(Math.max(1600, WAIT_MS));
  await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded", timeout: 45000 });
  return waitForFrontendAuthReady(page);
}

async function installFrontendAuthHint(context, page, profile = null) {
  const authStorageValue = JSON.stringify({ state: { isAuthenticated: true }, version: 0 });
  const userStorageValue = buildUserStorageValue(profile);
  await context.addInitScript(({ authValue, userValue }) => {
    try {
      window.localStorage.setItem("user_authenticated", "1");
      window.localStorage.setItem("auth-storage", authValue);
      if (userValue) window.localStorage.setItem("user-storage", userValue);
    } catch {
      // Ignore storage failures in restricted browser modes.
    }
  }, { authValue: authStorageValue, userValue: userStorageValue });
  await page.evaluate(({ authValue, userValue }) => {
    try {
      window.localStorage.setItem("user_authenticated", "1");
      window.localStorage.setItem("auth-storage", authValue);
      if (userValue) window.localStorage.setItem("user-storage", userValue);
    } catch {
      // Ignore storage failures in restricted browser modes.
    }
  }, { authValue: authStorageValue, userValue: userStorageValue }).catch(() => undefined);
}

async function loginBrowserContext(context, page, user) {
  try {
    const response = await context.request.post(`${API}/auth/login`, {
      data: {
        phone: user.phone,
        countryCode: user.countryCode,
        password: user.password,
      },
      headers: { "Content-Type": "application/json" },
      timeout: 15000,
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok() || body.code !== 0) return false;
    const profileResponse = await context.request.get(`${API}/user/profile`, {
      headers: { "X-Client-Visual-Audit": "1" },
      timeout: 15000,
    }).catch(() => null);
    const profileBody = profileResponse ? await profileResponse.json().catch(() => ({})) : {};
    const profile = profileResponse?.ok() && profileBody?.code === 0 ? profileBody.data : null;
    await installFrontendAuthHint(context, page, profile);
    await page.goto(`${BASE}/profile`, { waitUntil: "domcontentloaded", timeout: 45000 });
    return waitForFrontendAuthReady(page);
  } catch {
    return false;
  }
}

async function waitForFrontendAuthReady(page) {
  await page.waitForSelector("#root", { timeout: 12000 }).catch(() => undefined);
  const ready = await page.waitForFunction(
    async (apiBase) => {
      const hasLocalHint = window.localStorage.getItem("user_authenticated") === "1";
      if (!hasLocalHint) return false;
      try {
        const res = await fetch(`${apiBase}/user/profile`, {
          credentials: "include",
          headers: { "X-Client-Visual-Audit": "1" },
        });
        const body = await res.json().catch(() => ({}));
        return res.ok && body?.code === 0;
      } catch {
        return false;
      }
    },
    API,
    { timeout: 12000 },
  ).then(() => true).catch(() => false);
  if (!ready) return false;
  await page.waitForTimeout(WAIT_MS);
  return !page.url().includes("/login");
}

function routePlan({ productId, promotionSlug, orderId, orderNo, returnId }) {
  const productPath = productId ? `/product/${productId}` : "/product/v10-smoke-product-flash";
  const promotionPath = promotionSlug ? `/promotions/${promotionSlug}` : "/promotions/smoke-slug";
  const orderPath = orderId ? `/orders/${orderId}` : "/orders/SMOKE";
  const returnPath = returnId ? `/returns/${returnId}` : "/returns/SMOKE";
  const paymentLookup = orderId || orderNo || "";
  return [
    ["01-home", "/", "guest"],
    ["02-categories", "/categories", "guest"],
    ["03-search", "/search", "guest"],
    ["04-products", "/categories?is_new=1&home_new_arrivals_rule=1", "guest"],
    ["05-product-detail", productPath, "guest"],
    ["06-cart", "/cart", "auth"],
    ["07-checkout", "/checkout", "auth"],
    ["08-payment-result", paymentLookup ? `/payment/result?order_id=${encodeURIComponent(paymentLookup)}` : "/payment/result?order_no=SMOKE", "auth"],
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
    ["45-member-benefits", "/member/benefits", "auth"],
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
    ["36-return-detail", returnPath, "auth"],
    ["37-pending-reviews", "/reviews/pending", "auth"],
    ["38-history", "/history", "auth"],
    ["39-promotion-detail", promotionPath, "guest"],
    ["40-tiktok", "/tiktok", "guest"],
    ["41-system", "/client-design/system", "guest"],
    ["42-coupon-detail", "/client-design/coupon-detail", "auth"],
    ["43-share-detail", "/client-design/share-detail", "auth"],
    ["44-states", "/client-design/states", "guest"],
  ].map(([id, pathname, mode]) => ({ id, pathname, mode }));
}

async function waitForRouteReady(page, route) {
  const pathname = route.pathname.split("?")[0];
  const waits = [];
  if (pathname === "/") {
    waits.push(".sf-next-home-hero");
    await page.waitForFunction(
      () => !document.querySelector(".sf-next-quick-entry__item--loading"),
      { timeout: 6500 },
    ).catch(() => undefined);
  } else if (pathname === "/categories") {
    waits.push(".sf-next-category-shell, .sf-next-listing-section");
    await page.waitForFunction(
      () => !document.querySelector(".sf-next-product-card--skeleton"),
      { timeout: 6500 },
    ).catch(() => undefined);
  } else if (pathname === "/profile") {
    waits.push(".sf-next-profile-hero-card, .sf-next-profile-guest-card");
  } else if (pathname === "/cart") {
    waits.push(".sf-next-cart-item, .sf-next-cart-empty-card");
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return !text.includes("加载中") && !text.includes("Loading");
      },
      { timeout: 12000 },
    ).catch(() => undefined);
  } else if (pathname === "/coupons") {
    waits.push(".sf-next-coupon-hero, .sf-next-coupon-state:not([aria-live='polite'])");
    await page.waitForFunction(
      () => !(document.body?.innerText || "").includes("优惠券加载中"),
      { timeout: 6500 },
    ).catch(() => undefined);
  } else if (pathname.startsWith("/content/")) {
    waits.push(".sf-next-content-article, .sf-next-content-meta, .sf-next-contact-panel, .sf-next-route-state");
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return !document.querySelector(".sf-next-content-skeleton")
          && !text.includes("加载中...");
      },
      { timeout: 12000 },
    ).catch(() => undefined);
  } else if (pathname === "/promotions") {
    waits.push(".sf-next-promo-card__title, .sf-next-promo-state");
  } else if (pathname === "/search") {
    await page.waitForFunction(
      () => !document.querySelector(".sf-next-search-recent-card--skeleton"),
      { timeout: 6500 },
    ).catch(() => undefined);
  } else if (pathname === "/address") {
    waits.push(".sf-next-address-card, .sf-next-address-empty");
    await page.waitForFunction(
      () => !(document.body?.innerText || "").includes("加载中"),
      { timeout: 6500 },
    ).catch(() => undefined);
  } else if (pathname === "/checkout") {
    waits.push(".sf-next-checkout-card");
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return (text.includes("Visual Audit") || text.includes("Jalan Sultan Ismail"))
          && !text.includes("请选择收货信息")
          && !text.includes("添加收货地址后才能提交订单");
      },
      { timeout: 12000 },
    ).catch(() => undefined);
  } else if (pathname === "/invite") {
    waits.push(".sf-next-share-pass");
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return !text.includes("邀请码 加载中") && !text.includes("等待邀请码");
      },
      { timeout: 12000 },
    ).catch(() => undefined);
  } else if (pathname === "/member/benefits") {
    waits.push(".sc-benefits__folio, .sc-benefits__message");
  } else if (pathname.startsWith("/client-design/")) {
    waits.push(".sf-next-design-page__main, .sf-next-design-section");
    if (pathname === "/client-design/coupon-detail") {
      waits.push(".sf-next-value-vault");
    } else if (pathname === "/client-design/share-detail") {
      waits.push(".sf-next-share-pass");
      await page.waitForFunction(
        () => {
          const text = document.body?.innerText || "";
          return !text.includes("邀请码 加载中");
        },
        { timeout: 12000 },
      ).catch(() => undefined);
    } else if (pathname === "/client-design/states") {
      waits.push(".sf-next-design-state-skeleton, .sf-next-route-state");
    } else {
      waits.push(".sf-next-design-system-swatches");
    }
  } else if (pathname === "/notifications") {
    waits.push(".sf-next-account-status-panel, .sf-next-notifications-card, .sf-next-notifications-filters");
    await page.waitForFunction(
      () => !(document.body?.innerText || "").includes("正在加载消息"),
      { timeout: 6500 },
    ).catch(() => undefined);
  } else if (pathname === "/reviews/pending") {
    waits.push(".sf-next-pending-reviews-card, .sf-next-pending-reviews-state");
    await page.waitForFunction(
      () => !document.querySelector(".sf-next-pending-reviews-skeleton"),
      { timeout: 6500 },
    ).catch(() => undefined);
  } else if (pathname === "/orders") {
    waits.push(".sf-next-order-card:not(.sf-next-order-card--skeleton), .sf-next-orders-state");
  } else if (/^\/orders\/[^/]+$/.test(pathname)) {
    waits.push(".sf-next-order-detail-hero:not(.sf-next-order-detail-loading-hero), .sf-next-order-detail-state");
  } else if (/^\/orders\/[^/]+\/logistics$/.test(pathname)) {
    waits.push(".sf-next-logistics-hero, .sf-next-logistics-card:not(.sf-next-logistics-loading)");
  } else if (pathname === "/payment/result") {
    waits.push(".sf-next-payment-result-card");
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return !text.includes("正在确认支付") && !text.includes("正在读取后端订单状态");
      },
      { timeout: 12000 },
    ).catch(() => undefined);
  } else if (pathname === "/rewards") {
    waits.push(".sf-next-rewards-folio, .sf-next-rewards-state");
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return !text.includes("正在同步返现奖励") && !text.includes("正在同步返现记录");
      },
      { timeout: 12000 },
    ).catch(() => undefined);
  } else if (pathname === "/wallet") {
    waits.push(".sf-next-wallet-hero");
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return !text.includes("RM --") && !text.includes("同步中");
      },
      { timeout: 12000 },
    ).catch(() => undefined);
  } else if (pathname === "/points" || pathname === "/points/gifts") {
    if (pathname === "/points") {
      waits.push(".sf-next-points-folio, .sf-next-points-state");
    }
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return !text.includes("正在同步积分")
          && !text.includes("规则同步中")
          && !text.includes("正在加载签到规则")
          && !text.includes("加载中 积分明细");
      },
      { timeout: 6500 },
    ).catch(() => undefined);
    if (pathname === "/points/gifts") {
      waits.push(".sf-next-points-gifts-grid, .sf-next-points-gifts-state");
      await page.waitForFunction(
        () => !document.querySelector(".sf-next-points-gifts-state .animate-spin"),
        { timeout: 6500 },
      ).catch(() => undefined);
    }
  } else if (pathname === "/returns") {
    waits.push(".sf-next-returns-hero");
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return text.includes("售后进度中心")
          && !text.includes("正在同步退款")
          && !text.includes("加载中...");
      },
      { timeout: 12000 },
    ).catch(() => undefined);
  } else if (/^\/returns\/[^/]+$/.test(pathname)) {
    await page.waitForFunction(
      (targetPathname) => {
        const text = document.body?.innerText || "";
        if (location.pathname !== targetPathname) {
          return !text.includes("正在同步退款") && !text.includes("加载中...");
        }
        return Boolean(document.querySelector(".sf-next-return-detail-hero"))
          || !text.includes("加载中...");
      },
      pathname,
      { timeout: 6500 },
    ).catch(() => undefined);
  } else if (pathname === "/history") {
    waits.push(".sf-next-history-group, .sf-next-account-empty-panel");
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return (text.includes("最近浏览") || text.includes("暂无浏览记录"))
          && !document.querySelector(".sf-next-history-page .animate-pulse");
      },
      { timeout: 12000 },
    ).catch(() => undefined);
  }

  for (const selector of waits) {
    await page.locator(selector).first().waitFor({ state: "visible", timeout: 6500 }).catch(() => undefined);
  }

  if (pathname === "/returns") {
    await page.waitForFunction(
      () => {
        const text = document.body?.innerText || "";
        return !text.includes("正在同步退款") && !text.includes("加载中...");
      },
      { timeout: 6500 },
    ).catch(() => undefined);
  }
}

async function triggerLazyMedia(page) {
  const viewport = page.viewportSize() || VIEWPORT;
  const step = Math.max(240, Math.floor((viewport.height || 844) * 0.72));
  const scrollHeight = await page.evaluate(() => {
    const doc = document.documentElement;
    return Math.max(doc.scrollHeight, document.body?.scrollHeight || 0, window.innerHeight);
  }).catch(() => viewport.height || 844);

  for (let y = 0; y <= scrollHeight + step; y += step) {
    await page.evaluate((top) => window.scrollTo(0, top), y).catch(() => undefined);
    await page.waitForTimeout(70);
  }

  await page.waitForLoadState("networkidle", { timeout: 2500 }).catch(() => undefined);
  await page.evaluate(() => window.scrollTo(0, 0)).catch(() => undefined);
  await page.waitForFunction(
    () => {
      const images = Array.from(document.querySelectorAll("#root img"));
      const criticalImages = images.filter((image) => {
        const rect = image.getBoundingClientRect();
        return rect.width > 24 && rect.height > 24 && rect.top < window.innerHeight * 2.2;
      });
      return criticalImages.every((image) => image.complete && image.naturalWidth > 0);
    },
    { timeout: 3500 },
  ).catch(() => undefined);
  await page.waitForTimeout(240);
}

async function captureRoute(page, route, outDir, user) {
  if (route.mode === "auth" && user?.profile) {
    await installFrontendAuthHint(page.context(), page, user.profile);
  }
  let response = await page.goto(`${BASE}${route.pathname}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  if (route.mode === "auth" && user && page.url().includes("/login")) {
    await loginBrowserContext(page.context(), page, user) || await loginFrontend(page, user);
    response = await page.goto(`${BASE}${route.pathname}`, { waitUntil: "domcontentloaded", timeout: 45000 });
  }
  await page.waitForSelector("#root", { timeout: 12000 }).catch(() => undefined);
  await page.waitForTimeout(WAIT_MS);
  if (route.mode === "auth" && user && page.url().includes("/login")) {
    await loginBrowserContext(page.context(), page, user) || await loginFrontend(page, user);
    response = await page.goto(`${BASE}${route.pathname}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector("#root", { timeout: 12000 }).catch(() => undefined);
    await page.waitForTimeout(WAIT_MS);
  }
  await page.waitForFunction(
    () => (document.querySelector("#root")?.textContent || "").replace(/\s+/g, "").length > 0,
    { timeout: 6500 },
  ).catch(() => undefined);
  await waitForRouteReady(page, route);
  await page.waitForTimeout(Math.max(350, Math.floor(WAIT_MS / 3)));
  if (route.mode === "auth" && user && page.url().includes("/login")) {
    await loginBrowserContext(page.context(), page, user) || await loginFrontend(page, user);
    response = await page.goto(`${BASE}${route.pathname}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector("#root", { timeout: 12000 }).catch(() => undefined);
    await page.waitForTimeout(WAIT_MS);
    await waitForRouteReady(page, route);
    await page.waitForFunction(
      () => (document.querySelector("#root")?.textContent || "").replace(/\s+/g, "").length > 0,
      { timeout: 6500 },
    ).catch(() => undefined);
    await page.waitForTimeout(Math.max(350, Math.floor(WAIT_MS / 3)));
  }
  const rootHasText = await page.evaluate(() => (document.querySelector("#root")?.textContent || "").replace(/\s+/g, "").length > 0).catch(() => false);
  if (!rootHasText) {
    response = await page.reload({ waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => response);
    await page.waitForSelector("#root", { timeout: 12000 }).catch(() => undefined);
    await page.waitForTimeout(WAIT_MS);
    await waitForRouteReady(page, route);
    await page.waitForFunction(
      () => (document.querySelector("#root")?.textContent || "").replace(/\s+/g, "").length > 0,
      { timeout: 6500 },
    ).catch(() => undefined);
  }
  await triggerLazyMedia(page);
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
  let returnRequest = null;
  let promotionSlug = "";
  let authReady = false;
  let cartSeeded = false;
  let returnSeedError = "";
  let returnOrderPrepared = false;
  let returnOrderPrepareError = "";

  if (apiAvailable) {
    try {
      user = await registerUser();
      const seed = await seedProduct(user.token);
      product = seed.product;
      cartSeeded = seed.cartSeeded;
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
    authReady = await loginBrowserContext(authContext, authPage, user) || await loginFrontend(authPage, user);
    if (authReady && product) {
      order = await createOrder(user.token, product, user.phone);
      order = await fetchOrder(user.token, order?.id) || order;
      await seedHistory(user.token, product);
      await seedProduct(user.token).catch(() => undefined);
      const prepared = await prepareOrderForReturnDetailSeed(order?.id || "");
      returnOrderPrepared = prepared.ok;
      returnOrderPrepareError = prepared.error;
      if (prepared.ok) {
        order = await fetchOrder(user.token, order?.id) || order;
      }
      const returnSeed = await seedReturnRequest(user.token, order, user.phone);
      returnRequest = returnSeed.returnRequest;
      returnSeedError = [returnOrderPrepareError, returnSeed.error].filter(Boolean).join("; ");
    }
  }

  const routes = routePlan({
    productId: product?.id || "",
    promotionSlug,
    orderId: order?.id || "",
    orderNo: order?.order_no || order?.orderNo || "",
    returnId: returnRequest?.id || "",
  });
  const captures = [];
  for (const route of routes) {
    const page = route.mode === "auth" && authReady ? authPage : guestPage;
    captures.push(await captureRoute(page, route, outDir, user));
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
    orderNo: order?.order_no || order?.orderNo || "",
    returnOrderPrepared,
    returnOrderPrepareError,
    returnId: returnRequest?.id || "",
    returnSeeded: Boolean(returnRequest?.id),
    returnSeedError,
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

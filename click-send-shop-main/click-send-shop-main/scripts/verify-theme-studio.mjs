import { chromium } from "@playwright/test";

const BASE = process.env.THEME_STUDIO_URL || "http://127.0.0.1:4173";

const MOCK_SKIN_CONFIG = {
  skinName: "验证皮肤",
  bgColor: "#F5F7FA",
  surfaceColor: "#FFFFFF",
  primaryColor: "#00B14F",
  secondaryColor: "#E0F5E9",
  accentColor: "#FFC107",
  priceColor: "#FF5722",
  textColor: "#333333",
  mutedTextColor: "#888888",
  borderColor: "#E5E7EB",
  successColor: "#00A65A",
  warningColor: "#FF9800",
  dangerColor: "#F44336",
  radius: "12px",
  fontFamily: "system-ui, sans-serif",
  shadowStyle: "soft",
  buttonStyle: "rounded",
  navStyle: "clean",
  badgeStyle: "soft",
  priceStyle: "bold",
  productCardVariant: "standard",
  cardStyle: "elevated",
  cardTextAlign: "left",
  imageRatio: "1 / 1",
  imageFit: "cover",
  homeLayout: "classic",
  headerStyle: "clean",
  bannerStyle: "fresh",
  couponStyle: "ticket",
  memberCardStyle: "light",
  categoryIconStyle: "soft",
  motionLevel: "soft",
  density: "comfortable",
  adminThemeMode: "follow_store",
};

const MOCK_PRODUCT = {
  id: "verify-product",
  name: "验证商品",
  subtitle: "主题预览真实商品",
  image_url: "",
  images: [],
  price: 90,
  original_price: 120,
  points: 0,
  category_id: "verify-category",
  stock: 12,
  status: "active",
  sort_order: 1,
  description: "用于 Theme Studio 真实路由预览验证。",
  is_recommended: true,
  is_new: true,
  is_hot: false,
  variants: [],
};

function apiOk(data) {
  return JSON.stringify({ code: 0, message: "ok", data });
}

async function installApiMocks(context, baseUrl) {
  const apiPattern = `${new URL(baseUrl).origin}/api/**`;
  await context.route(apiPattern, async (route) => {
    const url = route.request().url();
    if (url.includes("/admin/auth/refresh") || url.includes("/admin/auth/login")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: apiOk({}) });
    }
    if (url.includes("/admin/account/profile")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiOk({
          id: "verify-admin",
          username: "verify",
          role: "admin",
          permissions: ["settings.manage"],
          isSuperAdmin: true,
        }),
      });
    }
    if (url.includes("/theme/skins")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiOk({
          defaultSkinId: "premium_champagne_ivory",
          activeSkinId: "premium_champagne_ivory",
          holidaySkinId: "festival_spring_ruby_gold",
          skins: [
            {
              id: "premium_champagne_ivory",
              name: "默认皮肤",
              clientEnabled: true,
              config: MOCK_SKIN_CONFIG,
            },
          ],
        }),
      });
    }
    if (!url.includes("/admin/") && /\/api\/products(\?|$)/.test(url)) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiOk({
          list: [MOCK_PRODUCT],
          total: 1,
          page: 1,
          pageSize: 1,
          totalPages: 1,
        }),
      });
    }
    if (!url.includes("/admin/") && url.includes("/api/products/verify-product/related")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: apiOk([]) });
    }
    if (!url.includes("/admin/") && url.includes("/api/products/verify-product")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: apiOk(MOCK_PRODUCT) });
    }
    if (!url.includes("/admin/") && url.includes("/api/reviews/product/verify-product/stats")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiOk({
          total: 0,
          avg_rating: 5,
          rating_distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          image_review_count: 0,
        }),
      });
    }
    if (!url.includes("/admin/") && url.includes("/api/reviews/product/verify-product/eligibility")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiOk({
          can_review: false,
          reason: "login_required",
          message: "购买并确认收货后可评价",
          pending_items: [],
          reviewed_count: 0,
        }),
      });
    }
    if (!url.includes("/admin/") && url.includes("/api/reviews/product/verify-product")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: apiOk({
          list: [],
          total: 0,
          page: 1,
          pageSize: 10,
          totalPages: 0,
        }),
      });
    }
    if (url.includes("/admin/system/theme") || url.includes("/theme/active")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: apiOk({}) });
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: apiOk({}) });
  });
}

async function openEditorSection(page, sectionTitle) {
  const btn = page.locator("button").filter({ has: page.getByText(sectionTitle, { exact: true }) }).first();
  const expanded = await btn.getAttribute("aria-expanded");
  if (expanded !== "true") await btn.click();
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1600, height: 900 } });
  await installApiMocks(context, BASE);
  await context.addInitScript(() => {
    localStorage.setItem("admin_authenticated", "1");
    localStorage.setItem(
      "admin-permissions",
      JSON.stringify({ state: { permissions: ["settings.manage"], isSuperAdmin: true }, version: 0 }),
    );
  });
  const page = await context.newPage();

  page.on("pageerror", (err) => console.error("PAGE_ERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("CONSOLE:", msg.text());
  });

  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(800);
  if (page.url().includes("/admin/login")) {
    throw new Error(`未进入管理后台，当前 URL: ${page.url()}。请确认 preview 已 build 且 localStorage 鉴权生效。`);
  }
  await page.goto(`${BASE}/admin/settings/theme`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page
    .getByText(/Theme Studio|皮肤设计工作台|皮肤设置/i)
    .first()
    .waitFor({ timeout: 45000 });

  const preview = page.locator("aside").filter({ has: page.getByText("实时预览", { exact: true }) }).first();
  await preview.waitFor({ state: "visible", timeout: 15000 });
  const routeIframe = preview.locator('iframe[title="Theme live route preview"]').first();
  await routeIframe.waitFor({ state: "visible", timeout: 15000 });
  const routeFrame = page.frameLocator('aside iframe[title="Theme live route preview"]');
  await routeFrame.locator("body").waitFor({ state: "visible", timeout: 15000 });
  await page.waitForFunction(() => {
    const frame = document.querySelector('aside iframe[title="Theme live route preview"]');
    const root = frame?.contentDocument?.documentElement;
    return root?.getAttribute("data-theme-admin-mode") === "fixed";
  }, null, { timeout: 15000 });
  const initialIframeSrc = await routeIframe.getAttribute("src");

  const editorTabs = await page.locator("[data-theme-editor-tab]").evaluateAll((tabs) =>
    tabs.map((tab) => tab.getAttribute("data-theme-editor-tab")),
  );
  const editorTabsLocked = editorTabs.join(",") === "basic,colors";
  const legacyEditorSectionsAbsent =
    (await page.locator("#theme-section-components, #theme-section-product, #theme-section-home, #theme-section-advanced").count()) === 0;
  const designLockSummaryOk = await page.getByTestId("theme-design-lock-summary").isVisible();
  const lockedFieldCount = await page.locator("[data-theme-lock-field]").count();
  const designLocksApplied = await routeFrame.locator("html").evaluate((el) => ({
    navStyle: el.getAttribute("data-theme-nav-style"),
    productCardVariant: el.getAttribute("data-theme-product-card-variant"),
    couponStyle: el.getAttribute("data-theme-coupon-style"),
    adminMode: el.getAttribute("data-theme-admin-mode"),
  }));

  const sticky = await preview.evaluate((el) => {
    const style = getComputedStyle(el);
    return { position: style.position, top: style.top };
  });

  await openEditorSection(page, "颜色");
  const primaryHex = page
    .locator("#theme-field-primaryColor input")
    .nth(1);
  await primaryHex.scrollIntoViewIfNeeded();
  await primaryHex.fill("#2563EB");
  await page.waitForTimeout(400);

  const previewPrimary = await routeFrame.locator("html").evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--theme-primary").trim(),
  );

  await preview.getByRole("button", { name: "前台首页" }).click().catch(() => preview.getByRole("button", { name: "首页" }).click());
  await page.waitForTimeout(300);
  const homeIframeSrc = await routeIframe.getAttribute("src");

  const healthSummaryOk = await page.getByText(/健康检查|Theme health/i).first().isVisible();
  const routeHealthOk = await preview.getByText("页面加载").first().isVisible();
  const homePreviewVisible = await routeFrame.locator("body").isVisible();

  await preview.getByRole("button", { name: "商品详情" }).click();
  await page.waitForTimeout(800);
  const productIframeSrc = await routeIframe.getAttribute("src");
  const productVisible = productIframeSrc?.includes("/product/verify-product") || false;

  await page.getByTitle("全屏预览").click();
  const fullscreenDialog = page.getByRole("dialog", { name: /全屏预览/i });
  await fullscreenDialog.waitFor({ state: "visible", timeout: 5000 });
  const fullscreenOk = await fullscreenDialog.isVisible();
  const fullscreenIframeOk =
    (await fullscreenDialog.locator('iframe[title="Theme live route preview"]').count()) === 1;
  await page.getByLabel("关闭").click().catch(() => page.keyboard.press("Escape"));

  const result = {
    ok:
      sticky.position === "sticky" &&
      (previewPrimary.toLowerCase().includes("2563eb") ||
        previewPrimary.includes("37") ||
        previewPrimary.includes("99")) &&
      editorTabsLocked &&
      legacyEditorSectionsAbsent &&
      designLockSummaryOk &&
      lockedFieldCount >= 8 &&
      designLocksApplied.navStyle === "glass" &&
      designLocksApplied.productCardVariant === "premium" &&
      designLocksApplied.couponStyle === "premium" &&
      designLocksApplied.adminMode === "fixed" &&
      !!initialIframeSrc?.includes("themePreview=1") &&
      !!homeIframeSrc?.includes("previewScene=home") &&
      homePreviewVisible &&
      healthSummaryOk &&
      routeHealthOk &&
      productVisible &&
      fullscreenOk &&
      fullscreenIframeOk,
    sticky,
    previewPrimary,
    editorTabs,
    editorTabsLocked,
    legacyEditorSectionsAbsent,
    designLockSummaryOk,
    lockedFieldCount,
    designLocksApplied,
    initialIframeSrc,
    homeIframeSrc,
    homePreviewVisible,
    healthSummaryOk,
    routeHealthOk,
    productIframeSrc,
    productVisible,
    fullscreenOk,
    fullscreenIframeOk,
    url: page.url(),
  };

  console.log(JSON.stringify(result, null, 2));
  await browser.close();

  if (!result.ok) process.exit(1);
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err) }));
  process.exit(1);
});

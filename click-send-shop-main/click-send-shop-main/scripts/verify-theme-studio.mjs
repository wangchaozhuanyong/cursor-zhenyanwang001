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
          defaultSkinId: "default_life_green",
          activeSkinId: "default_life_green",
          skins: [
            {
              id: "default_life_green",
              name: "默认皮肤",
              clientEnabled: true,
              config: MOCK_SKIN_CONFIG,
            },
          ],
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

async function selectThemeOption(page, sectionTitle, labelText, value) {
  if (sectionTitle) await openEditorSection(page, sectionTitle);
  const label = page.locator("label").filter({ has: page.locator("span", { hasText: labelText }) });
  await label.locator("select").selectOption(value);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
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
    .getByRole("heading", { name: /Theme Studio|皮肤设计工作台/i })
    .waitFor({ timeout: 45000 });

  const preview = page.locator('[aria-label="实时预览"]');
  const themeScope = preview.locator("[data-theme-admin-mode]").first();

  const sticky = await preview.evaluate((el) => {
    const style = getComputedStyle(el);
    return { position: style.position, top: style.top };
  });

  await openEditorSection(page, "基础颜色");
  const primaryHex = page
    .locator("div.rounded-lg.border")
    .filter({ has: page.getByText("主色", { exact: true }) })
    .locator("input.font-mono")
    .first();
  await primaryHex.scrollIntoViewIfNeeded();
  await primaryHex.fill("#2563EB");
  await page.waitForTimeout(400);

  const previewPrimary = await themeScope.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--theme-primary").trim(),
  );

  await page.getByRole("button", { name: "前台首页" }).click().catch(() => page.getByRole("button", { name: "首页" }).click());
  await page.waitForTimeout(300);

  const couponCard = preview.locator('[data-theme-coupon-style].grid').first();
  const couponBefore = await couponCard.getAttribute("data-theme-coupon-style");
  await selectThemeOption(page, "首页营销模块", "优惠券", "deal");
  await page.waitForTimeout(400);
  const couponAfter = await couponCard.getAttribute("data-theme-coupon-style");
  const couponDealBg = await couponCard.evaluate((el) => getComputedStyle(el).backgroundImage);
  const couponStyleOk = couponBefore !== couponAfter && couponAfter === "deal" && couponDealBg.includes("gradient");

  const productVariantBefore = await themeScope.getAttribute("data-theme-product-card-variant");
  await selectThemeOption(page, "商品卡", "商品卡变体", "compact");
  await page.waitForTimeout(400);
  const productVariantAfter = await themeScope.getAttribute("data-theme-product-card-variant");
  const productCardCompact = await preview.locator(".theme-product-card .flex.gap-3").count();

  await selectThemeOption(page, "按钮与导航", "底部导航", "floating");
  await page.waitForTimeout(300);
  const navFloating = await preview.locator('[data-theme-nav-style="floating"]').count();

  await page.getByRole("button", { name: "商品详情" }).click();
  await page.waitForTimeout(300);
  const productVisible = await preview.getByText("加入购物车").isVisible();
  const actionBar = preview.locator('[data-testid="product-detail-preview-action-bar"]');
  const actionBarPosition = await actionBar.evaluate((el) => getComputedStyle(el).position);
  const actionBarInPreview = await actionBar.evaluate((bar) => {
    const previewRoot = bar.closest('[aria-label="实时预览"]');
    if (!previewRoot) return false;
    const barRect = bar.getBoundingClientRect();
    const rootRect = previewRoot.getBoundingClientRect();
    return barRect.bottom <= rootRect.bottom + 2 && barRect.top >= rootRect.top;
  });

  await selectThemeOption(page, "首页营销模块", "标签风格", "outline");
  await page.waitForTimeout(400);
  const badgeOutline = await preview.locator("span").filter({ hasText: "热销" }).first().evaluate((el) => {
    const style = getComputedStyle(el);
    return style.backgroundColor === "transparent" || style.backgroundColor === "rgba(0, 0, 0, 0)";
  });

  await selectThemeOption(page, "商品卡", "图片填充", "contain");
  await page.waitForTimeout(300);
  const imageFit = await preview.locator(".aspect-square img").first().evaluate((img) => getComputedStyle(img).objectFit);

  await selectThemeOption(page, "高级设置", "后台主题模式", "fixed");
  await page.waitForTimeout(300);
  const adminModeAttr = await themeScope.getAttribute("data-theme-admin-mode");
  const adminModeVar = await themeScope.evaluate((el) =>
    getComputedStyle(el).getPropertyValue("--theme-admin-mode").trim(),
  );

  await page.getByRole("button", { name: "全屏预览" }).click();
  const fullscreenDialog = page.getByRole("dialog", { name: /全屏预览/i });
  await fullscreenDialog.waitFor({ state: "visible", timeout: 5000 });
  const fullscreenOk = await fullscreenDialog.isVisible();
  await page.getByLabel("关闭").click().catch(() => page.keyboard.press("Escape"));

  const result = {
    ok:
      sticky.position === "sticky" &&
      (previewPrimary.toLowerCase().includes("2563eb") ||
        previewPrimary.includes("37") ||
        previewPrimary.includes("99")) &&
      productVisible &&
      couponStyleOk &&
      productVariantAfter === "compact" &&
      productCardCompact > 0 &&
      badgeOutline &&
      navFloating > 0 &&
      actionBarPosition === "sticky" &&
      actionBarInPreview &&
      imageFit === "contain" &&
      adminModeAttr === "fixed" &&
      adminModeVar === "fixed" &&
      fullscreenOk,
    sticky,
    previewPrimary,
    productVisible,
    couponStyleOk,
    productVariantBefore,
    productVariantAfter,
    productCardCompact,
    badgeOutline,
    navFloating,
    actionBarPosition,
    actionBarInPreview,
    imageFit,
    adminModeAttr,
    adminModeVar,
    fullscreenOk,
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

import { chromium } from "@playwright/test";

const BASE = process.env.THEME_STUDIO_URL || "http://127.0.0.1:4173";

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.addInitScript(() => {
    localStorage.setItem("admin_authenticated", "1");
    localStorage.setItem(
      "admin-permissions",
      JSON.stringify({ state: { permissions: ["settings.manage"], isSuperAdmin: true }, version: 0 }),
    );
  });

  page.on("pageerror", (err) => console.error("PAGE_ERROR:", err.message));
  page.on("console", (msg) => {
    if (msg.type() === "error") console.error("CONSOLE:", msg.text());
  });

  await page.goto(`${BASE}/admin`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2000);
  const adminSnippet = (await page.locator("body").innerText()).slice(0, 200);
  console.log("ADMIN_HOME:", adminSnippet.replace(/\n/g, " "));

  const modInfo = await page.evaluate(async () => {
    try {
      const m = await import(`/src/modules/admin/pages/settings/AdminThemeSettings.tsx?t=${Date.now()}`);
      return { ok: true, keys: Object.keys(m), defaultType: typeof m.default, defaultName: m.default?.name || null };
    } catch (e) {
      return { ok: false, error: String(e) };
    }
  });
  console.log("MODULE:", JSON.stringify(modInfo));

  await page.goto(`${BASE}/admin/settings/theme`, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("heading", { name: /Theme Studio/i }).waitFor({ timeout: 30000 });

  const title = await page.title();
  const bodyText = (await page.locator("body").innerText()).slice(0, 500);
  if (!bodyText.includes("Theme Studio")) {
    await page.screenshot({ path: "theme-studio-verify-fail.png", fullPage: true });
    throw new Error(`Theme Studio not found. title=${title} url=${page.url()} snippet=${bodyText}`);
  }

  const sticky = await page.locator('[aria-label="实时预览"]').evaluate((el) => {
    const style = getComputedStyle(el);
    return { position: style.position, top: style.top };
  });

  const primaryInput = page.locator('input[aria-label="主色 色块"]').first();
  await primaryInput.scrollIntoViewIfNeeded();
  await primaryInput.fill("#2563EB", { force: true });

  await page.waitForTimeout(400);

  const previewPrimary = await page
    .locator('[aria-label="实时预览"]')
    .evaluate((el) => getComputedStyle(el).getPropertyValue("--theme-primary").trim());

  await page.getByRole("button", { name: "商品详情" }).click();
  await page.waitForTimeout(300);
  const productVisible = await page.locator('[aria-label="实时预览"]').getByText("加入购物车").isVisible();

  await page.getByRole("button", { name: "全屏预览" }).click();
  const fullscreenDialog = page.getByRole("dialog", { name: /全屏预览/i });
  await fullscreenDialog.waitFor({ state: "visible", timeout: 5000 });
  const fullscreenOk = await fullscreenDialog.isVisible();
  await page.getByLabel("关闭").click().catch(() => page.keyboard.press("Escape"));

  console.log(
    JSON.stringify(
      {
        ok: true,
        sticky,
        previewPrimary,
        productVisible,
        fullscreenOk,
        url: page.url(),
      },
      null,
      2,
    ),
  );

  await browser.close();
}

main().catch((err) => {
  console.error(JSON.stringify({ ok: false, error: String(err) }));
  process.exit(1);
});

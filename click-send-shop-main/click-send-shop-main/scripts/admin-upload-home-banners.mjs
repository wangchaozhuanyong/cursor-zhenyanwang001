import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://www.flashcast.com.my";
const ADMIN_PHONE = process.env.ADMIN_PHONE || "18800000001";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123456";
const BANNER_DIR =
  process.env.BANNER_DIR || path.resolve(process.cwd(), "..", "..", "artifacts", "home-banners-webp");

const FILES = ["home-banner-01.webp", "home-banner-02.webp", "home-banner-03.webp"];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loginAdmin(page) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await page.fill('input[placeholder="输入账号"]', ADMIN_PHONE);
  await page.fill('input[placeholder="输入密码"]', ADMIN_PASSWORD);
  await page.getByRole("button", { name: "登录" }).click();
  await page.waitForTimeout(1500);
}

async function createOneBanner(page, imagePath, index) {
  await page.getByRole("button", { name: "添加 Banner" }).click();
  await page.waitForSelector('input[type="file"]', { state: "attached", timeout: 10000 });

  const input = page.locator('input[type="file"]').last();
  await input.setInputFiles(imagePath);

  // Wait for upload callback to fill preview image
  await page.locator("label img").first().waitFor({ state: "visible", timeout: 15000 });

  await page.getByPlaceholder("Banner 标题").fill(`首页轮播图 ${index}`);
  await page.getByPlaceholder("跳转链接（如 /categories）").fill("/categories");

  await page.getByRole("button", { name: "确认添加" }).click();
  await sleep(1200);
}

async function main() {
  for (const f of FILES) {
    const p = path.resolve(BANNER_DIR, f);
    if (!fs.existsSync(p)) {
      throw new Error(`missing banner file: ${p}`);
    }
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  await loginAdmin(page);
  await page.goto(`${BASE}/admin/banners`, { waitUntil: "networkidle" });

  for (let i = 0; i < FILES.length; i += 1) {
    const p = path.resolve(BANNER_DIR, FILES[i]);
    await createOneBanner(page, p, i + 1);
  }

  await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
  const shot = path.resolve(process.cwd(), "..", "..", "artifacts", "home-banner-upload-proof.png");
  await page.screenshot({ path: shot, fullPage: true });

  await browser.close();

  console.log(
    JSON.stringify(
      {
        base: BASE,
        uploaded: FILES.length,
        bannerFiles: FILES,
        screenshot: shot,
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(`ADMIN_BANNER_UPLOAD_FAILED: ${e.message}`);
  process.exit(1);
});


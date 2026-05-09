import { chromium } from "@playwright/test";

const BASE = process.env.BASE_URL || "https://flashcast.com.my";
const pages = ["/", "/login", "/help", "/about", "/admin/login"];

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ ignoreHTTPSErrors: true });
  const results = [];

  for (const pathname of pages) {
    const url = `${BASE}${pathname}`;
    let status = -1;
    let ok = false;
    let title = "";
    let error = "";
    try {
      const res = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });
      status = res?.status() ?? -1;
      ok = status >= 200 && status < 400;
      title = await page.title();
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    results.push({ pathname, url, ok, status, title, error });
  }

  await browser.close();
  console.log(JSON.stringify({ base: BASE, results }, null, 2));
}

main().catch((err) => {
  console.error(`SMOKE_BASIC_FAILED: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});

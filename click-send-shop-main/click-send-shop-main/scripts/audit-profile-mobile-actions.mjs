import { chromium } from "@playwright/test";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

const MOBILE_VIEWPORT = {
  width: Number(process.env.PROFILE_MOBILE_WIDTH || 390),
  height: Number(process.env.PROFILE_MOBILE_HEIGHT || 844),
};
const NAV_TIMEOUT_MS = Number(process.env.PROFILE_NAV_TIMEOUT_MS || 18000);
const WAIT_MS = Number(process.env.PROFILE_WAIT_MS || 900);
const BASE_URL_TIMEOUT_MS = Number(process.env.PROFILE_BASE_URL_TIMEOUT_MS || 2500);
const BLOCK_SERVICE_WORKERS = process.env.PROFILE_ALLOW_SERVICE_WORKER !== "1";

const NAV_EXPECTATIONS = [
  { key: "editProfile", expectedPath: "/login" },
  { key: "address", expectedPath: "/login" },
  { key: "returns", expectedPath: "/login" },
  { key: "settings", expectedPath: "/login" },
  { key: "notifications", expectedPath: "/login" },
  { key: "favorites", expectedPath: "/favorites" },
  { key: "history", expectedPath: "/history" },
  { key: "support", expectedPath: "/support-download", expectedSearch: { tab: "support" } },
  { key: "help", expectedPath: "/help" },
  { key: "feedback", expectedPath: "/feedback" },
  { key: "about", expectedPath: "/about" },
];
const VISIBLE_PROFILE_ACTION_SELECTOR = "button[data-feature-key]:visible";

function normalizeBaseUrl(value) {
  return String(value || "").trim().replace(/\/$/, "");
}

function readHtml(url, timeoutMs = BASE_URL_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const request = (parsed.protocol === "https:" ? httpsRequest : httpRequest)(
      parsed,
      { method: "GET", timeout: timeoutMs },
      (response) => {
        let body = "";
        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          resolve({
            ok: Boolean(response.statusCode && response.statusCode >= 200 && response.statusCode < 400),
            status: response.statusCode || 0,
            body,
          });
        });
      },
    );
    request.on("timeout", () => {
      request.destroy(new Error(`Timed out after ${timeoutMs}ms`));
    });
    request.on("error", reject);
    request.end();
  });
}

async function pickBaseUrl() {
  if (process.env.BASE_URL) return normalizeBaseUrl(process.env.BASE_URL);

  const candidates = [
    "http://127.0.0.1:4175",
    "http://127.0.0.1:4174",
    "http://127.0.0.1:4173",
    "http://127.0.0.1:5177",
    "http://127.0.0.1:5176",
    "http://127.0.0.1:5175",
    "http://127.0.0.1:5174",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080",
  ];

  for (const candidate of candidates) {
    try {
      const response = await readHtml(`${candidate}/profile`);
      if (response.ok && response.body.includes('id="root"')) return candidate;
    } catch {
      // Try the next candidate.
    }
  }

  throw new Error("No local storefront found. Start Vite/preview or set BASE_URL.");
}

function selectorForFeature(key) {
  return `button[data-feature-key="${key}"]:visible`;
}

async function openProfile(page, baseUrl) {
  await page.goto(`${baseUrl}/profile`, { waitUntil: "domcontentloaded", timeout: NAV_TIMEOUT_MS });
  await page.waitForSelector(".sf-next-profile-page", { timeout: 8000 });
  await page.waitForSelector(VISIBLE_PROFILE_ACTION_SELECTOR, { timeout: 8000 });
  await page.waitForTimeout(WAIT_MS);
}

async function inspectButtonHitTarget(page, locator) {
  await locator.evaluate((button) => {
    button.scrollIntoView({ block: "center", inline: "nearest" });
  });
  await page.waitForTimeout(120);

  return locator.evaluate((button) => {
    const rect = button.getBoundingClientRect();
    const centerX = Math.min(Math.max(rect.left + rect.width / 2, 0), window.innerWidth - 1);
    const centerY = Math.min(Math.max(rect.top + rect.height / 2, 0), window.innerHeight - 1);
    const hit = document.elementFromPoint(centerX, centerY);
    const owner = hit?.closest("button[data-feature-key]");
    const bottomNav = hit?.closest(".sf-next-bottom-nav");
    return {
      key: button.getAttribute("data-feature-key") || "",
      label: (button.textContent || "").replace(/\s+/g, " ").trim(),
      rect: {
        top: Math.round(rect.top),
        bottom: Math.round(rect.bottom),
        left: Math.round(rect.left),
        right: Math.round(rect.right),
      },
      center: { x: Math.round(centerX), y: Math.round(centerY) },
      hitText: (hit?.textContent || "").replace(/\s+/g, " ").trim().slice(0, 80),
      hitSelector: hit ? `${hit.tagName.toLowerCase()}${hit.className ? `.${String(hit.className).trim().replace(/\s+/g, ".")}` : ""}` : null,
      coveredByBottomNav: Boolean(bottomNav),
      ownsHitTarget: owner === button,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      scrollY: Math.round(window.scrollY),
    };
  });
}

function matchesExpectation(url, expectation) {
  const parsed = new URL(url);
  if (parsed.pathname !== expectation.expectedPath) return false;
  if (!expectation.expectedSearch) return true;
  return Object.entries(expectation.expectedSearch).every(([key, value]) => parsed.searchParams.get(key) === value);
}

async function auditHitTargets(page, baseUrl) {
  await openProfile(page, baseUrl);
  const count = await page.locator(VISIBLE_PROFILE_ACTION_SELECTOR).count();
  const results = [];
  const failures = [];

  for (let i = 0; i < count; i += 1) {
    const result = await inspectButtonHitTarget(page, page.locator(VISIBLE_PROFILE_ACTION_SELECTOR).nth(i));
    results.push(result);
    if (!result.ownsHitTarget) {
      failures.push({
        key: result.key,
        label: result.label,
        message: result.coveredByBottomNav
          ? "center point is covered by bottom navigation"
          : "center point does not resolve to the profile action button",
        detail: result,
      });
    }
  }

  return { results, failures };
}

async function auditNavigation(page, baseUrl) {
  const results = [];
  const failures = [];

  for (const expectation of NAV_EXPECTATIONS) {
    await openProfile(page, baseUrl);
    const locator = page.locator(selectorForFeature(expectation.key)).first();
    if ((await locator.count()) === 0) {
      results.push({ key: expectation.key, skipped: true, reason: "button not rendered" });
      continue;
    }

    const hitTarget = await inspectButtonHitTarget(page, locator);
    if (!hitTarget.ownsHitTarget) {
      failures.push({
        key: expectation.key,
        message: "cannot click because the target is covered",
        detail: hitTarget,
      });
      continue;
    }

    await locator.click({ timeout: 5000 });
    await page.waitForTimeout(700);
    const href = page.url();
    const passed = matchesExpectation(href, expectation);
    results.push({
      key: expectation.key,
      expectedPath: expectation.expectedPath,
      expectedSearch: expectation.expectedSearch || null,
      href,
      passed,
    });
    if (!passed) {
      failures.push({
        key: expectation.key,
        message: "navigation did not reach the expected route",
        expected: expectation,
        href,
      });
    }
  }

  return { results, failures };
}

async function main() {
  const baseUrl = await pickBaseUrl();
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    ignoreHTTPSErrors: true,
    viewport: MOBILE_VIEWPORT,
    isMobile: true,
    hasTouch: true,
    serviceWorkers: BLOCK_SERVICE_WORKERS ? "block" : "allow",
  });
  const page = await context.newPage();

  try {
    const hitTargetAudit = await auditHitTargets(page, baseUrl);
    const navigationAudit = await auditNavigation(page, baseUrl);
    const failures = [...hitTargetAudit.failures, ...navigationAudit.failures];
    const summary = {
      baseUrl,
      viewport: MOBILE_VIEWPORT,
      checkedHitTargets: hitTargetAudit.results.length,
      checkedNavigation: navigationAudit.results.filter((item) => !item.skipped).length,
      skippedNavigation: navigationAudit.results.filter((item) => item.skipped).length,
      failed: failures.length,
      serviceWorkers: BLOCK_SERVICE_WORKERS ? "blocked" : "allowed",
    };

    console.log(JSON.stringify({ summary, failures, hitTargetAudit, navigationAudit }, null, 2));
    if (failures.length) process.exitCode = 1;
  } finally {
    await context.close();
    await browser.close();
  }
}

main().catch((error) => {
  console.error(`PROFILE_MOBILE_ACTION_AUDIT_FAILED: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});

#!/usr/bin/env node
/**
 * Minimal dynamic security baseline for a deployed API target.
 *
 * This script avoids destructive payloads. It checks headers and verifies that
 * common protected or sensitive endpoints do not accept anonymous/forged calls.
 *
 * Required for strict mode:
 *   DAST_BASE_URL=https://staging.example.com
 *
 * Useful optional settings:
 *   DAST_ALLOWED_HOSTS=staging.example.com,127.0.0.1
 *   DAST_ALLOW_EXTERNAL=1
 *   DAST_REQUIRED=1
 *   DAST_ADMIN_ORIGIN=https://admin-staging.example.com
 *   DAST_AUTH_HEADER="Authorization: Bearer ..."
 *   DAST_COOKIE="name=value; other=value"
 *   DAST_PRODUCTION_ACK=I_UNDERSTAND_THIS_IS_PRODUCTION
 */

const rawBaseUrl = String(process.env.DAST_BASE_URL || "").trim();
const required = process.env.DAST_REQUIRED === "1";

function fail(message) {
  console.error(`[check-dast-baseline] FAILED: ${message}`);
  process.exit(1);
}

if (!rawBaseUrl) {
  if (required) fail("DAST_BASE_URL is required when DAST_REQUIRED=1.");
  console.log("[check-dast-baseline] SKIP: DAST_BASE_URL is not set.");
  process.exit(0);
}

let baseUrl;
try {
  baseUrl = new URL(rawBaseUrl);
} catch {
  fail(`Invalid DAST_BASE_URL: ${rawBaseUrl}`);
}

if (!["http:", "https:"].includes(baseUrl.protocol)) {
  fail("DAST_BASE_URL must use http or https.");
}

const localhostNames = new Set(["localhost", "127.0.0.1", "::1"]);
const allowedHosts = String(process.env.DAST_ALLOWED_HOSTS || "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const productionHosts = String(
  process.env.DAST_PRODUCTION_HOSTS ||
    "damatong.net,www.damatong.net,console.damatong.net,cdn.damatong.net",
)
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);
const host = baseUrl.hostname.toLowerCase();
const isLocalTarget = localhostNames.has(host);
const externalAllowed =
  process.env.DAST_ALLOW_EXTERNAL === "1" || allowedHosts.includes(host);

if (!isLocalTarget && !externalAllowed) {
  fail(
    `Refusing to scan external host ${baseUrl.hostname}. Set DAST_ALLOW_EXTERNAL=1 or DAST_ALLOWED_HOSTS.`,
  );
}

if (
  productionHosts.includes(host) &&
  process.env.DAST_PRODUCTION_ACK !== "I_UNDERSTAND_THIS_IS_PRODUCTION"
) {
  fail(
    `Refusing to scan production host ${baseUrl.hostname}. Use staging, or set DAST_PRODUCTION_ACK explicitly.`,
  );
}

const authHeaderRaw = String(process.env.DAST_AUTH_HEADER || "").trim();
const cookieRaw = String(process.env.DAST_COOKIE || "").trim();
const adminOrigin = String(process.env.DAST_ADMIN_ORIGIN || baseUrl.origin).trim();

function target(pathname) {
  const url = new URL(pathname, baseUrl);
  return url.toString();
}

function authHeaders() {
  const headers = {};
  if (authHeaderRaw) {
    const idx = authHeaderRaw.indexOf(":");
    if (idx <= 0) fail("DAST_AUTH_HEADER must look like 'Header-Name: value'.");
    headers[authHeaderRaw.slice(0, idx).trim()] = authHeaderRaw.slice(idx + 1).trim();
  }
  if (cookieRaw) headers.Cookie = cookieRaw;
  return headers;
}

async function request(pathname, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10_000);
  try {
    const headers = {
      "User-Agent": "click-send-shop-dast-baseline/1.0",
      Accept: "application/json,text/plain,*/*",
      ...(options.headers || {}),
    };
    if (options.auth) Object.assign(headers, authHeaders());
    const response = await fetch(target(pathname), {
      method: options.method || "GET",
      headers,
      body: options.body,
      redirect: "manual",
      signal: controller.signal,
    });
    const text = await response.text().catch(() => "");
    return { response, text };
  } catch (error) {
    fail(`Request failed for ${pathname}: ${error?.message || String(error)}`);
  } finally {
    clearTimeout(timeout);
  }
}

function expectStatus(name, actual, allowed) {
  if (!allowed.includes(actual)) {
    fail(`${name}: expected ${allowed.join("/")} but got ${actual}.`);
  }
}

function expectNot2xx(name, actual) {
  if (actual >= 200 && actual < 300) {
    fail(`${name}: endpoint accepted a request that should be rejected.`);
  }
}

function expectHeader(response, name, expectedPattern) {
  const value = response.headers.get(name) || "";
  if (!expectedPattern.test(value)) {
    fail(`Missing or weak security header ${name}; got '${value || "(empty)"}'.`);
  }
}

const checks = [];

async function check(name, fn) {
  const started = Date.now();
  await fn();
  checks.push({ name, ms: Date.now() - started });
  console.log(`[check-dast-baseline] OK: ${name}`);
}

await check("health endpoint and baseline headers", async () => {
  const { response } = await request("/api/health/live");
  expectStatus("health endpoint", response.status, [200]);
  expectHeader(response, "x-content-type-options", /nosniff/i);
  expectHeader(response, "x-robots-tag", /noindex/i);
  expectHeader(response, "content-security-policy", /default-src/i);
});

await check("anonymous user profile is rejected", async () => {
  const { response } = await request("/api/user/profile");
  expectStatus("anonymous user profile", response.status, [401]);
});

await check("anonymous upload is rejected before parsing", async () => {
  const { response } = await request("/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/octet-stream" },
    body: Buffer.from("not-a-real-upload"),
  });
  expectStatus("anonymous upload", response.status, [401]);
});

await check("admin mutating API blocks missing origin/csrf", async () => {
  const { response } = await request("/api/admin/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "dast-probe" }),
  });
  expectStatus("admin mutation without origin/csrf", response.status, [403, 404]);
});

await check("admin API blocks forged origin", async () => {
  const { response } = await request("/api/admin/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: "https://evil.example",
    },
    body: JSON.stringify({ phone: "18800000001", password: "invalid" }),
  });
  expectStatus("admin forged origin", response.status, [403, 404]);
});

await check("manual payment webhook rejects unsigned payload", async () => {
  const { response } = await request("/api/payments/webhooks/manual", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: adminOrigin,
    },
    body: JSON.stringify({
      event_id: "dast_probe_unsigned",
      order_id: "dast_probe_order",
      timestamp: String(Date.now()),
      nonce: "dastnonce123",
    }),
  });
  expectNot2xx("unsigned manual payment webhook", response.status);
});

await check("encoded path traversal under uploads is not served", async () => {
  const { response, text } = await request("/uploads/%2e%2e/%2e%2e/server/.env");
  expectNot2xx("encoded uploads path traversal", response.status);
  if (/JWT_SECRET|DB_PASSWORD|STRIPE_SECRET_KEY/i.test(text)) {
    fail("encoded uploads path traversal response appears to contain secret material.");
  }
});

console.log(`[check-dast-baseline] All ${checks.length} checks passed for ${baseUrl.origin}.`);

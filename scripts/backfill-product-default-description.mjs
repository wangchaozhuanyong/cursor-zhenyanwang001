const DEFAULT_PRODUCT_DESCRIPTION = `大马通正品承诺

在大马通购物，安心有保障。本商品保证为正品，支持假一赔十承诺。我们坚持诚信经营，严格筛选商品品质，只为让每一位会员买得放心、用得安心。

大马通感谢您的信任与支持，祝您购物愉快！`;

const DEFAULT_ADMIN_BASE_URL = "https://console.damatong.net";
const PAGE_SIZE = 50;
const REQUEST_DELAY_MS = Number.parseInt(process.env.REQUEST_DELAY_MS || "120", 10);

const ADMIN_BASE_URL = cleanBaseUrl(process.env.ADMIN_BASE_URL || process.env.BASE_URL || DEFAULT_ADMIN_BASE_URL);
const API_BASE_URL = cleanBaseUrl(process.env.API_BASE_URL || `${ADMIN_BASE_URL}/api`);
const ADMIN_REFERER = `${ADMIN_BASE_URL}/admin/products`;
const ADMIN_PHONE = String(process.env.ADMIN_PHONE || "18800000001").trim();
const ADMIN_PASSWORD = String(process.env.ADMIN_PASSWORD || "").trim();
const ADMIN_TOKEN = String(process.env.ADMIN_TOKEN || "").trim();
const DRY_RUN = process.env.DRY_RUN === "1";
const CONFIRMED = process.env.CONFIRM_PRODUCT_DESCRIPTION_BACKFILL === "1";
const cookieJar = new Map();
let csrfToken = "";

function cleanBaseUrl(value) {
  return String(value || "").trim().replace(/\/+$/, "");
}

function sleep(ms) {
  if (!Number.isFinite(ms) || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireWriteConfirmation() {
  if (DRY_RUN) return;
  if (!CONFIRMED) {
    throw new Error("Missing CONFIRM_PRODUCT_DESCRIPTION_BACKFILL=1 for live API writes.");
  }
}

async function readJsonResponse(res, context) {
  const text = await res.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(`${context} -> non-JSON response ${res.status}: ${text.slice(0, 200)}`);
    }
  }
  if (!res.ok || body.code !== 0) {
    throw new Error(`${context} -> ${body.message || res.status}`);
  }
  return body.data;
}

function collectCookies(res) {
  const setCookies = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : String(res.headers.get("set-cookie") || "").split(/,(?=[^;]+?=)/).filter(Boolean);
  for (const header of setCookies) {
    const first = String(header || "").split(";")[0];
    const index = first.indexOf("=");
    if (index <= 0) continue;
    cookieJar.set(first.slice(0, index).trim(), first.slice(index + 1));
  }
}

function cookieHeader() {
  return [...cookieJar.entries()].map(([key, value]) => `${key}=${value}`).join("; ");
}

function withSessionHeaders(headers = {}, { json = false, unsafe = false } = {}) {
  const next = {
    Origin: ADMIN_BASE_URL,
    Referer: ADMIN_REFERER,
    ...headers,
  };
  if (json) next["Content-Type"] = "application/json";
  const cookies = cookieHeader();
  if (cookies) next.Cookie = cookies;
  if (unsafe && csrfToken) next["X-CSRF-Token"] = csrfToken;
  return next;
}

async function api(path, options = {}) {
  const res = await fetch(`${API_BASE_URL}${path}`, options);
  collectCookies(res);
  return readJsonResponse(res, `${options.method || "GET"} ${path}`);
}

async function loginAdmin() {
  if (ADMIN_TOKEN) {
    await refreshCsrf();
    return ADMIN_TOKEN;
  }
  if (!ADMIN_PASSWORD) {
    throw new Error("Missing ADMIN_PASSWORD env. Set ADMIN_PASSWORD or ADMIN_TOKEN to call the admin API.");
  }
  const data = await api("/admin/auth/login", {
    method: "POST",
    headers: withSessionHeaders({}, { json: true }),
    body: JSON.stringify({
      phone: ADMIN_PHONE,
      username: ADMIN_PHONE,
      password: ADMIN_PASSWORD,
    }),
  });
  const token = typeof data.token === "string" ? data.token : data.token?.accessToken || data.accessToken;
  if (!token) throw new Error("Admin login succeeded but no token was returned.");
  csrfToken = String(data.csrfToken || csrfToken || "");
  if (!csrfToken) await refreshCsrf();
  return token;
}

async function refreshCsrf() {
  const data = await api("/admin/auth/csrf", {
    headers: withSessionHeaders(),
  });
  csrfToken = String(data?.csrfToken || "");
  if (!csrfToken) throw new Error("Admin CSRF endpoint did not return a token.");
}

function authHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

function unpackPage(data) {
  const list = Array.isArray(data?.list)
    ? data.list
    : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
        ? data
        : [];
  const total = Number(data?.total ?? list.length);
  return { list, total };
}

async function fetchProducts(token) {
  const products = [];
  let page = 1;
  let total = Number.POSITIVE_INFINITY;

  while (products.length < total) {
    const params = new URLSearchParams({ page: String(page), pageSize: String(PAGE_SIZE) });
    const data = await api(`/admin/products?${params.toString()}`, {
      headers: withSessionHeaders({ Authorization: `Bearer ${token}` }),
    });
    const current = unpackPage(data);
    total = Number.isFinite(current.total) ? current.total : products.length + current.list.length;
    products.push(...current.list);
    if (current.list.length < PAGE_SIZE) break;
    page += 1;
  }

  return products;
}

async function updateDescription(token, product) {
  if (DRY_RUN) return null;
  return api(`/admin/products/${product.id}`, {
    method: "PUT",
    headers: withSessionHeaders(authHeaders(token), { json: true, unsafe: true }),
    body: JSON.stringify({ description: DEFAULT_PRODUCT_DESCRIPTION }),
  });
}

async function verifyDescriptions(token) {
  const products = await fetchProducts(token);
  return products.filter((product) => String(product.description || "") !== DEFAULT_PRODUCT_DESCRIPTION);
}

async function main() {
  requireWriteConfirmation();
  console.log(`[product-description] API=${API_BASE_URL}`);
  console.log(`[product-description] mode=${DRY_RUN ? "dry-run" : "live"}`);

  const token = await loginAdmin();
  const products = await fetchProducts(token);
  console.log(`[product-description] products=${products.length}`);

  const mismatched = products.filter((product) => String(product.description || "") !== DEFAULT_PRODUCT_DESCRIPTION);
  console.log(`[product-description] need_update=${mismatched.length}`);

  let updated = 0;
  const unchanged = products.length - mismatched.length;
  const failures = [];

  for (const product of mismatched) {
    try {
      await updateDescription(token, product);
      updated += DRY_RUN ? 0 : 1;
      const action = DRY_RUN ? "would_update" : "updated";
      console.log(`[product-description] ${action} id=${product.id} name=${JSON.stringify(product.name || "")}`);
    } catch (error) {
      failures.push({ id: product.id, name: product.name || "", error: error.message || String(error) });
      console.error(`[product-description] failed id=${product.id} name=${JSON.stringify(product.name || "")}: ${error.message || error}`);
    }
    await sleep(REQUEST_DELAY_MS);
  }

  if (!DRY_RUN && !failures.length) {
    const remaining = await verifyDescriptions(token);
    if (remaining.length > 0) {
      throw new Error(`Verification failed: ${remaining.length} products still do not match the default description.`);
    }
  }

  console.log(`[product-description] summary updated=${updated} unchanged=${unchanged} failed=${failures.length}`);
  if (failures.length) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(`[product-description] ERROR: ${error.message || error}`);
  process.exit(1);
});

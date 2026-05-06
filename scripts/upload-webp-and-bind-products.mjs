import fs from "node:fs";
import path from "node:path";

const BASE = process.env.BASE_URL || "http://13.212.179.213";
const API = `${BASE}/api`;
const ADMIN_PHONE = process.env.ADMIN_PHONE || "18800000001";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Admin123456";
const USE_DIRECT_URLS = process.env.USE_DIRECT_URLS === "1";
const ASSET_DIR = process.env.ASSET_DIR
  ? path.resolve(process.cwd(), process.env.ASSET_DIR)
  : path.resolve(process.cwd(), "artifacts", "webp-products");

async function jfetch(url, options = {}) {
  const res = await fetch(url, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.code !== 0) {
    throw new Error(`${options.method || "GET"} ${url} -> ${body.message || res.status}`);
  }
  return body.data;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function loginAdmin() {
  const data = await jfetch(`${API}/admin/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone: ADMIN_PHONE, password: ADMIN_PASSWORD }),
  });
  return typeof data.token === "string" ? data.token : data.token?.accessToken;
}

async function loginUser(phone, password) {
  const data = await jfetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password }),
  });
  return data.token?.accessToken || data.token;
}

async function uploadWebpImages(userToken) {
  const files = fs.readdirSync(ASSET_DIR).filter((f) => f.endsWith(".webp")).sort();
  if (!files.length) throw new Error("No webp files found");
  const urls = [];
  for (const f of files) {
    const p = path.join(ASSET_DIR, f);
    const buf = fs.readFileSync(p);
    let uploaded = false;
    for (let i = 0; i < 4 && !uploaded; i += 1) {
      const form = new FormData();
      form.append("file", new Blob([buf], { type: "image/webp" }), f);
      try {
        const data = await jfetch(`${API}/upload`, {
          method: "POST",
          headers: { Authorization: `Bearer ${userToken}` },
          body: form,
        });
        urls.push(`${BASE}${data.url}`);
        uploaded = true;
      } catch (e) {
        const msg = String(e.message || e);
        if (!msg.includes("上传过于频繁") || i === 3) throw e;
        await sleep(1200 * (i + 1));
      }
    }
    await sleep(220);
  }
  return urls;
}

async function fetchSimProducts(adminToken) {
  const data = await jfetch(`${API}/admin/products?page=1&pageSize=50`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  return (data.list || []).filter((p) => String(p.name || "").startsWith("模拟商品"));
}

async function updateProductsImages(adminToken, products, urls) {
  let updated = 0;
  for (let i = 0; i < products.length; i += 1) {
    const p = products[i];
    const cover = urls[i % urls.length];
    const images = [
      cover,
      urls[(i + 1) % urls.length],
      urls[(i + 2) % urls.length],
    ];
    await jfetch(`${API}/admin/products/${p.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        cover_image: cover,
        images,
        description: `${p.description || ""}\n[webp-updated] 商品图已更新为WebP素材。`,
      }),
    });
    updated += 1;
  }
  return updated;
}

async function updateBanners(adminToken, urls) {
  const data = await jfetch(`${API}/admin/banners?page=1&pageSize=20`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const banners = data.list || data || [];
  let updated = 0;
  for (let i = 0; i < Math.min(6, banners.length); i += 1) {
    const b = banners[i];
    await jfetch(`${API}/admin/banners/${b.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: urls[(i * 3) % urls.length],
        title: b.title || `展示图-${i + 1}`,
        enabled: true,
        publish_status: "published",
      }),
    });
    updated += 1;
  }
  return updated;
}

async function main() {
  const adminToken = await loginAdmin();
  const urls = USE_DIRECT_URLS
    ? fs
        .readdirSync(ASSET_DIR)
        .filter((f) => f.endsWith(".webp"))
        .sort()
        .map((f) => `${BASE}/uploads/${f}`)
    : await uploadWebpImages(adminToken);
  const products = await fetchSimProducts(adminToken);
  const productsUpdated = await updateProductsImages(adminToken, products, urls);
  const bannersUpdated = await updateBanners(adminToken, urls);

  console.log(
    JSON.stringify(
      {
        uploadedWebp: urls.length,
        productsUpdated,
        bannersUpdated,
        sampleUrls: urls.slice(0, 5),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(`UPLOAD_BIND_FAILED: ${e.message}`);
  process.exit(1);
});


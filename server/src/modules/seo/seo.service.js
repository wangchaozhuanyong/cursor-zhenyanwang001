const db = require('../../config/db');

const SITEMAP_MAX_URLS = 50000;

const STATIC_PUBLIC_PATHS = [
  '/',
  '/categories',
  '/new-arrivals',
  '/help',
  '/about',
];

function stripTrailingSlash(value) {
  return String(value || '').trim().replace(/\/+$/, '');
}

function getPublicBaseUrl(req) {
  const configured = stripTrailingSlash(process.env.PUBLIC_APP_URL);
  if (configured) return configured;

  const protocol = req?.get?.('x-forwarded-proto')?.split(',')[0]?.trim() || req?.protocol || 'http';
  const host = req?.get?.('host') || 'localhost';
  return `${protocol}://${host}`;
}

function encodePathSegment(value) {
  return encodeURIComponent(String(value));
}

function toIsoDateTime(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildUrl(baseUrl, path) {
  return `${baseUrl}${path.startsWith('/') ? path : `/${path}`}`;
}

async function selectProductsForSitemap() {
  try {
    const [rows] = await db.query(
      `SELECT id, COALESCE(updated_at, created_at) AS lastmod
       FROM products
       WHERE lifecycle_status = 1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at DESC
       LIMIT ?`,
      [SITEMAP_MAX_URLS],
    );
    return rows;
  } catch (err) {
    if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [rows] = await db.query(
      `SELECT id, created_at AS lastmod
       FROM products
       WHERE lifecycle_status = 1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, created_at DESC
       LIMIT ?`,
      [SITEMAP_MAX_URLS],
    );
    return rows;
  }
}

async function selectCategoriesForSitemap() {
  try {
    const [rows] = await db.query(
      `SELECT id, updated_at AS lastmod
       FROM categories
       WHERE is_active = 1 AND is_visible = 1 AND deleted_at IS NULL
       ORDER BY parent_id IS NOT NULL, parent_id ASC, sort_order ASC, id ASC
       LIMIT ?`,
      [SITEMAP_MAX_URLS],
    );
    return rows;
  } catch (err) {
    if (err?.code !== 'ER_BAD_FIELD_ERROR') throw err;
    const [rows] = await db.query(
      `SELECT id, NULL AS lastmod
       FROM categories
       WHERE is_active = 1 AND deleted_at IS NULL
       ORDER BY sort_order ASC, id ASC
       LIMIT ?`,
      [SITEMAP_MAX_URLS],
    );
    return rows;
  }
}

async function selectContentPagesForSitemap() {
  const [rows] = await db.query(
    `SELECT slug, last_modified_at AS lastmod
     FROM content_pages
     WHERE publish_status = 'published' AND deleted_at IS NULL
     ORDER BY slug ASC
     LIMIT ?`,
    [SITEMAP_MAX_URLS],
  );
  return rows;
}

function renderUrl({ loc, lastmod, changefreq, priority }) {
  const lines = ['  <url>', `    <loc>${escapeXml(loc)}</loc>`];
  const isoLastmod = toIsoDateTime(lastmod);
  if (isoLastmod) lines.push(`    <lastmod>${isoLastmod}</lastmod>`);
  if (changefreq) lines.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) lines.push(`    <priority>${priority}</priority>`);
  lines.push('  </url>');
  return lines.join('\n');
}

async function withSitemapFallback(label, loader) {
  try {
    return await loader();
  } catch (err) {
    console.warn(`[seo] ${label} sitemap query failed: ${err?.message || err}`);
    return [];
  }
}

async function buildSitemapXml(req) {
  const baseUrl = getPublicBaseUrl(req);
  const [products, categories, contentPages] = await Promise.all([
    withSitemapFallback('products', selectProductsForSitemap),
    withSitemapFallback('categories', selectCategoriesForSitemap),
    withSitemapFallback('content_pages', selectContentPagesForSitemap),
  ]);

  const entries = [
    ...STATIC_PUBLIC_PATHS.map((path) => ({
      loc: buildUrl(baseUrl, path),
      changefreq: path === '/' ? 'daily' : 'weekly',
      priority: path === '/' ? '1.0' : '0.8',
    })),
    ...categories.map((category) => ({
      loc: buildUrl(baseUrl, `/categories?cat=${encodeURIComponent(category.id)}`),
      lastmod: category.lastmod,
      changefreq: 'weekly',
      priority: '0.7',
    })),
    ...products.map((product) => ({
      loc: buildUrl(baseUrl, `/product/${encodePathSegment(product.id)}`),
      lastmod: product.lastmod,
      changefreq: 'weekly',
      priority: '0.8',
    })),
    ...contentPages.map((page) => ({
      loc: buildUrl(baseUrl, `/content/${encodePathSegment(page.slug)}`),
      lastmod: page.lastmod,
      changefreq: 'monthly',
      priority: '0.6',
    })),
  ].slice(0, SITEMAP_MAX_URLS);

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map(renderUrl),
    '</urlset>',
    '',
  ].join('\n');
}

function buildRobotsTxt(req) {
  const sitemapUrl = buildUrl(getPublicBaseUrl(req), '/sitemap.xml');
  return [
    'User-agent: Googlebot',
    'Allow: /',
    '',
    'User-agent: Bingbot',
    'Allow: /',
    '',
    'User-agent: Twitterbot',
    'Allow: /',
    '',
    'User-agent: facebookexternalhit',
    'Allow: /',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${sitemapUrl}`,
    '',
  ].join('\n');
}

module.exports = {
  buildRobotsTxt,
  buildSitemapXml,
};

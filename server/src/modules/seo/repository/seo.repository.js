const db = require('../../../config/db');

const SITEMAP_MAX_URLS = 50000;

async function selectProductsForSitemapWithUpdatedAt() {
  const [rows] = await db.query(
    `SELECT id, name, description, category_id, COALESCE(updated_at, created_at) AS lastmod,
            COALESCE(allow_index, 1) AS allow_index,
            COALESCE(is_age_restricted, 0) AS is_age_restricted,
            compliance_type
     FROM products
     WHERE lifecycle_status = 1
       AND deleted_at IS NULL
       AND COALESCE(allow_index, 1) = 1
       AND COALESCE(is_age_restricted, 0) = 0
       AND (compliance_type IS NULL OR compliance_type = '' OR compliance_type = 'normal')
     ORDER BY sort_order ASC, created_at DESC
     LIMIT ?`,
    [SITEMAP_MAX_URLS],
  );
  return rows;
}

async function selectProductsForSitemapFallback() {
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

async function selectCategoriesForSitemapWithUpdatedAt() {
  const [rows] = await db.query(
    `SELECT id, updated_at AS lastmod
     FROM categories
     WHERE is_active = 1 AND is_visible = 1 AND deleted_at IS NULL
     ORDER BY parent_id IS NOT NULL, parent_id ASC, sort_order ASC, id ASC
     LIMIT ?`,
    [SITEMAP_MAX_URLS],
  );
  return rows;
}

async function selectCategoriesForSitemapFallback() {
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

async function selectContentPagesForSitemap() {
  const [rows] = await db.query(
    `SELECT slug, title, content, last_modified_at AS lastmod
     FROM content_pages
     WHERE publish_status = 'published'
       AND deleted_at IS NULL
     ORDER BY slug ASC
     LIMIT ?`,
    [SITEMAP_MAX_URLS],
  );
  return rows;
}

module.exports = {
  SITEMAP_MAX_URLS,
  selectProductsForSitemapWithUpdatedAt,
  selectProductsForSitemapFallback,
  selectCategoriesForSitemapWithUpdatedAt,
  selectCategoriesForSitemapFallback,
  selectContentPagesForSitemap,
};

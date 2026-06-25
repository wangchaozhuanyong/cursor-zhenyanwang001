const db = require('../../../config/db');

const REFERENCE_SOURCES = [
  { table: 'products', columns: ['cover_image', 'images', 'video_url', 'description'] },
  { table: 'product_variants', columns: ['image_url'] },
  { table: 'product_spec_values', columns: ['image_url'] },
  { table: 'banners', columns: ['image', 'link'] },
  { table: 'categories', columns: ['image', 'icon', 'icon_url', 'cover_image', 'banner_image_url'] },
  { table: 'content_pages', columns: ['body', 'cover_image', 'seo_image', 'content'] },
  { table: 'site_settings', columns: ['setting_value'] },
  { table: 'marketing_activities', columns: ['cover_image', 'description'] },
  { table: 'coupon_campaigns', columns: ['cover_image', 'description'] },
  { table: 'product_tags', columns: ['image_url'] },
  { table: 'product_reviews', columns: ['images', 'avatar'] },
  { table: 'users', columns: ['avatar'] },
  { table: 'oauth_accounts', columns: ['avatar_url'] },
  { table: 'wechat_accounts', columns: ['avatar_url'] },
  { table: 'pending_wechat_login', columns: ['avatar_url'] },
  { table: 'order_returns', columns: ['images', 'proof_images'] },
  { table: 'return_requests', columns: ['images', 'proof_images'] },
  { table: 'home_nav_items', columns: ['icon', 'icon_url', 'image_url', 'thumb_url'] },
  { table: 'points_gifts', columns: ['image', 'image_url'] },
  { table: 'uploaded_assets', columns: ['storage_key', 'source_storage_key', 'public_url', 'metadata'], excludeSameGroup: true },
];

function quoteIdentifier(identifier) {
  const value = String(identifier || '');
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    throw new Error(`Unsafe identifier: ${value}`);
  }
  return `\`${value}\``;
}

async function tableExists(tableName) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c
       FROM INFORMATION_SCHEMA.TABLES
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [tableName],
  );
  return Number(row?.c || 0) > 0;
}

async function columnExists(tableName, columnName) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c
       FROM INFORMATION_SCHEMA.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [tableName, columnName],
  );
  return Number(row?.c || 0) > 0;
}

async function getAvailableReferenceSources() {
  const sources = [];
  for (const source of REFERENCE_SOURCES) {
    if (!(await tableExists(source.table))) continue;
    const columns = [];
    for (const column of source.columns) {
      if (await columnExists(source.table, column)) columns.push(column);
    }
    if (columns.length) sources.push({ ...source, columns });
  }
  return sources;
}

function normalizeBatchSize(value) {
  const n = Number(value);
  if (!Number.isInteger(n) || n < 1) return 500;
  return Math.min(2000, n);
}

function normalizeMode(policy) {
  const mode = String(policy?.uploadedAssetMode || policy?.uploaded_asset_mode || 'orphaned').trim();
  return mode === 'soft_deleted' ? 'soft_deleted' : 'orphaned';
}

async function selectCandidateGroups(policy) {
  if (!(await tableExists('uploaded_assets'))) return [];
  const cutoffAt = policy.cutoffAt || new Date(Date.now() - Number(policy.retentionDays || 90) * 24 * 60 * 60 * 1000);
  const limit = normalizeBatchSize(policy.batchSize);
  const mode = normalizeMode(policy);

  if (mode === 'soft_deleted') {
    const [rows] = await db.query(
      `SELECT asset_group_id, COUNT(*) AS asset_count
         FROM uploaded_assets
        GROUP BY asset_group_id
       HAVING SUM(CASE WHEN deleted_at IS NULL THEN 1 ELSE 0 END) = 0
          AND SUM(CASE WHEN storage_key <> '' THEN 1 ELSE 0 END) > 0
          AND SUM(CASE WHEN status IN ('queued', 'processing') THEN 1 ELSE 0 END) = 0
          AND MAX(COALESCE(deleted_at, created_at)) < ?
        ORDER BY MIN(COALESCE(deleted_at, created_at)) ASC
        LIMIT ?`,
      [cutoffAt, limit],
    );
    return rows;
  }

  const [rows] = await db.query(
    `SELECT asset_group_id, COUNT(*) AS asset_count
       FROM uploaded_assets
      GROUP BY asset_group_id
     HAVING SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END) = 0
        AND SUM(CASE WHEN storage_key <> '' THEN 1 ELSE 0 END) > 0
        AND SUM(CASE WHEN status <> 'ready' THEN 1 ELSE 0 END) = 0
        AND MAX(created_at) < ?
      ORDER BY MIN(created_at) ASC
      LIMIT ?`,
    [cutoffAt, limit],
  );
  return rows;
}

async function selectAssetsByGroups(groupIds, mode) {
  if (!Array.isArray(groupIds) || groupIds.length === 0) return [];
  const placeholders = groupIds.map(() => '?').join(', ');
  const deletedFilter = mode === 'soft_deleted' ? 'deleted_at IS NOT NULL' : 'deleted_at IS NULL';
  const [rows] = await db.query(
    `SELECT *
       FROM uploaded_assets
      WHERE asset_group_id IN (${placeholders})
        AND ${deletedFilter}
      ORDER BY asset_group_id, variant_tag, id`,
    groupIds,
  );
  return rows;
}

async function groupHasReference(groupId, tokens, sources) {
  if (!tokens.length) return true;
  for (const source of sources) {
    const clauses = [];
    const params = [];

    if (source.excludeSameGroup) {
      clauses.push(`${quoteIdentifier('asset_group_id')} <> ?`);
      params.push(groupId);
    }

    const tokenClauses = [];
    for (const column of source.columns) {
      for (const token of tokens) {
        tokenClauses.push(`CAST(${quoteIdentifier(column)} AS CHAR) LIKE ?`);
        params.push(`%${token}%`);
      }
    }

    if (!tokenClauses.length) continue;
    clauses.push(`(${tokenClauses.join(' OR ')})`);

    const [[row]] = await db.query(
      `SELECT 1 AS hit
         FROM ${quoteIdentifier(source.table)}
        WHERE ${clauses.join(' AND ')}
        LIMIT 1`,
      params,
    );
    if (row) return true;
  }
  return false;
}

async function deleteAssetRows(ids) {
  if (!Array.isArray(ids) || !ids.length) return 0;
  const placeholders = ids.map(() => '?').join(', ');
  const [result] = await db.query(
    `DELETE FROM uploaded_assets WHERE id IN (${placeholders})`,
    ids,
  );
  return Number(result?.affectedRows || 0);
}

module.exports = {
  columnExists,
  deleteAssetRows,
  getAvailableReferenceSources,
  groupHasReference,
  normalizeMode,
  selectAssetsByGroups,
  selectCandidateGroups,
  tableExists,
};

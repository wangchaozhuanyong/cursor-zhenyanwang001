const fs = require('fs/promises');
const path = require('path');
const db = require('../../../config/db');
const {
  buildStorageKey,
  deleteS3Object,
  getPublicUrlByKey,
  isS3StorageEnabled,
} = require('../../../utils/objectStorage');
const { quoteIdentifier } = require('./policyCatalog.service');

const SERVER_ROOT = path.resolve(__dirname, '../../../..');
const PUBLIC_ROOT = path.join(SERVER_ROOT, 'public');
const UPLOADS_ROOT = path.join(PUBLIC_ROOT, 'uploads');
const MAX_REFERENCE_TOKENS = 60;

const REFERENCE_SOURCES = [
  { table: 'products', columns: ['cover_image', 'images', 'video_url', 'description'] },
  { table: 'product_variants', columns: ['image_url'] },
  { table: 'product_spec_values', columns: ['image_url'] },
  { table: 'banners', columns: ['image', 'link'] },
  { table: 'categories', columns: ['image', 'icon', 'icon_url', 'cover_image'] },
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

function cleanText(value) {
  return String(value || '').trim();
}

function withoutQuery(value) {
  return cleanText(value).split(/[?#]/)[0];
}

function tryDecode(value) {
  const text = cleanText(value);
  if (!text) return '';
  try {
    return decodeURIComponent(text);
  } catch {
    return text;
  }
}

function addToken(tokens, value) {
  const raw = cleanText(value);
  if (!raw || raw.startsWith('data:') || raw.startsWith('blob:')) return;

  for (const candidate of [raw, withoutQuery(raw), tryDecode(withoutQuery(raw))]) {
    const token = cleanText(candidate);
    if (token.length >= 8) tokens.add(token);

    if (token.startsWith('uploads/')) tokens.add(`/${token}`);
    if (token.startsWith('/uploads/')) tokens.add(token.replace(/^\/+/, ''));

    try {
      const url = new URL(token);
      const pathname = tryDecode(url.pathname);
      if (pathname.length >= 8) {
        tokens.add(pathname);
        tokens.add(pathname.replace(/^\/+/, ''));
      }
    } catch {
      // Non-URL values are valid local paths or object keys.
    }
  }
}

function collectAssetTokens(asset) {
  const tokens = new Set();
  addToken(tokens, asset?.public_url);
  addToken(tokens, asset?.storage_key);
  addToken(tokens, asset?.source_storage_key);

  for (const key of [asset?.storage_key, asset?.source_storage_key]) {
    if (!key) continue;
    try {
      addToken(tokens, getPublicUrlByKey(key));
    } catch {
      // Missing object-storage env should not make preview fail.
    }
    if (String(key).startsWith('uploads/')) {
      try {
        addToken(tokens, buildStorageKey(key));
      } catch {
        // Missing object-storage env should not make preview fail.
      }
    }
  }

  return [...tokens].filter((token) => token.length >= 8).slice(0, MAX_REFERENCE_TOKENS);
}

function collectGroupTokens(assets) {
  const tokens = new Set();
  for (const asset of assets || []) {
    for (const token of collectAssetTokens(asset)) tokens.add(token);
  }
  return [...tokens].slice(0, MAX_REFERENCE_TOKENS);
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
  const mode = cleanText(policy?.uploadedAssetMode || policy?.uploaded_asset_mode || 'orphaned');
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

function groupAssets(rows) {
  const groups = new Map();
  for (const row of rows || []) {
    const groupId = cleanText(row.asset_group_id);
    if (!groupId) continue;
    if (!groups.has(groupId)) groups.set(groupId, []);
    groups.get(groupId).push(row);
  }
  return groups;
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

function buildListResult(orphanGroups) {
  const assets = orphanGroups.flatMap((group) => group.assets);
  return {
    matched: assets.length,
    groups: orphanGroups,
    assets,
    batchCount: orphanGroups.length > 0 ? 1 : 0,
    sampleIds: assets.slice(0, 10).map((asset) => asset.id),
  };
}

async function listOrphanUploadedAssets(policy) {
  const mode = normalizeMode(policy);
  const candidates = await selectCandidateGroups(policy);
  if (!candidates.length) return buildListResult([]);

  const groupIds = candidates.map((row) => row.asset_group_id).filter(Boolean);
  const assetsByGroup = groupAssets(await selectAssetsByGroups(groupIds, mode));
  const sources = await getAvailableReferenceSources();
  const orphanGroups = [];

  for (const groupId of groupIds) {
    const assets = assetsByGroup.get(groupId) || [];
    if (!assets.length) continue;
    const tokens = collectGroupTokens(assets);
    if (!tokens.length) continue;
    if (await groupHasReference(groupId, tokens, sources)) continue;
    orphanGroups.push({ groupId, assets });
  }

  return buildListResult(orphanGroups);
}

function getUploadPathname(value) {
  const raw = cleanText(value);
  if (!raw) return '';

  if (raw.startsWith('/')) return withoutQuery(raw);
  if (raw.startsWith('uploads/')) return `/${withoutQuery(raw)}`;

  try {
    const pathname = withoutQuery(new URL(raw).pathname);
    const index = pathname.toLowerCase().lastIndexOf('/uploads/');
    return index >= 0 ? pathname.slice(index) : pathname;
  } catch {
    return '';
  }
}

function resolveLocalUploadPath(asset) {
  for (const value of [asset?.public_url, asset?.storage_key]) {
    const pathname = getUploadPathname(value);
    if (!pathname.startsWith('/uploads/') || pathname.includes('..')) continue;

    let decoded;
    try {
      decoded = decodeURIComponent(pathname.replace(/^\/+/, ''));
    } catch {
      continue;
    }

    const resolved = path.resolve(PUBLIC_ROOT, decoded);
    const uploadsRoot = path.resolve(UPLOADS_ROOT);
    if (resolved !== uploadsRoot && resolved.startsWith(`${uploadsRoot}${path.sep}`)) {
      return resolved;
    }
  }
  return '';
}

async function deletePhysicalAsset(asset) {
  const provider = cleanText(asset?.storage_provider).toLowerCase();
  const storageKey = cleanText(asset?.storage_key);
  if ((provider === 's3' || (!provider && isS3StorageEnabled())) && storageKey) {
    await deleteS3Object(storageKey);
    return;
  }

  const filePath = resolveLocalUploadPath(asset);
  if (!filePath) {
    throw new Error(`UNSAFE_UPLOAD_PATH:${asset?.id || ''}`);
  }

  try {
    await fs.unlink(filePath);
  } catch (error) {
    if (error?.code !== 'ENOENT') throw error;
  }
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

async function deleteOrphanUploadedAssets(policy, shouldCancel = null) {
  const scan = await listOrphanUploadedAssets(policy);
  let deleted = 0;
  let failed = 0;
  let batchCount = 0;
  let cancelled = false;

  for (const group of scan.groups) {
    if (shouldCancel && await shouldCancel()) {
      cancelled = true;
      break;
    }

    try {
      for (const asset of group.assets) {
        await deletePhysicalAsset(asset);
      }
      deleted += await deleteAssetRows(group.assets.map((asset) => asset.id));
      batchCount += 1;
    } catch {
      failed += group.assets.length;
    }
  }

  return {
    matched: scan.matched,
    deleted,
    failed,
    batchCount,
    sampleIds: scan.sampleIds,
    cancelled,
  };
}

module.exports = {
  deleteOrphanUploadedAssets,
  listOrphanUploadedAssets,
};

const fs = require('fs/promises');
const path = require('path');
const {
  buildStorageKey,
  deleteS3Object,
  getPublicUrlByKey,
  isS3StorageEnabled,
} = require('../../../utils/objectStorage');
const repo = require('../repository/uploadedAssetCleanup.repository');

const SERVER_ROOT = path.resolve(__dirname, '../../../..');
const PUBLIC_ROOT = path.join(SERVER_ROOT, 'public');
const UPLOADS_ROOT = path.join(PUBLIC_ROOT, 'uploads');
const MAX_REFERENCE_TOKENS = 60;

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
  const mode = repo.normalizeMode(policy);
  const candidates = await repo.selectCandidateGroups(policy);
  if (!candidates.length) return buildListResult([]);

  const groupIds = candidates.map((row) => row.asset_group_id).filter(Boolean);
  const assetsByGroup = groupAssets(await repo.selectAssetsByGroups(groupIds, mode));
  const sources = await repo.getAvailableReferenceSources();
  const orphanGroups = [];

  for (const groupId of groupIds) {
    const assets = assetsByGroup.get(groupId) || [];
    if (!assets.length) continue;
    const tokens = collectGroupTokens(assets);
    if (!tokens.length) continue;
    if (await repo.groupHasReference(groupId, tokens, sources)) continue;
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
      deleted += await repo.deleteAssetRows(group.assets.map((asset) => asset.id));
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

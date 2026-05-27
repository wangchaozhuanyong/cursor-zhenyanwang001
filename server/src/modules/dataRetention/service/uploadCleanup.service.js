const fs = require('fs');
const path = require('path');
const {
  buildStorageKey,
  deleteS3ObjectsBatch,
  isS3StorageEnabled,
  listS3ObjectsByPrefix,
} = require('../../../utils/objectStorage');
const repo = require('../repository/dataRetention.repository');

const DAY_MS = 24 * 60 * 60 * 1000;
const SERVER_ROOT = path.resolve(__dirname, '../../../..');
const UPLOAD_DIR = path.join(SERVER_ROOT, 'public/uploads');
const RAW_UPLOAD_PREFIX = 'uploads/raw/';
const UPLOAD_PREFIX = 'uploads/';

const REFERENCE_SOURCES = [
  { table: 'products', column: 'cover_image' },
  { table: 'products', column: 'images' },
  { table: 'products', column: 'video_url' },
  { table: 'product_variants', column: 'image_url' },
  { table: 'banners', column: 'image' },
  { table: 'site_settings', column: 'setting_value' },
  { table: 'content_pages', column: 'body' },
  { table: 'product_reviews', column: 'avatar' },
  { table: 'product_reviews', column: 'images' },
  { table: 'notifications', column: 'content' },
  { table: 'return_requests', column: 'images' },
  { table: 'categories', column: 'icon' },
  { table: 'users', column: 'avatar' },
];

function cutoffMs(days) {
  return Date.now() - Number(days || 0) * DAY_MS;
}

function isSafeUploadKey(key, { allowRaw = false } = {}) {
  const value = String(key || '').replace(/^\/+/, '');
  const storageUploadPrefix = buildStorageKey(UPLOAD_PREFIX);
  const storageRawPrefix = buildStorageKey(RAW_UPLOAD_PREFIX);
  if (allowRaw && value.startsWith(storageRawPrefix)) return true;
  return value.startsWith(storageUploadPrefix) && !value.startsWith(storageRawPrefix);
}

function assertSafeLocalUploadPath(filePath) {
  const resolved = path.resolve(filePath || '');
  const root = path.resolve(UPLOAD_DIR);
  if (!resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error('UNSAFE_UPLOAD_PATH');
  }
}

function toIsoDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeUploadRef(ref) {
  const raw = String(ref || '').trim();
  if (!raw) return [];
  const stripped = raw.split(/[?#]/)[0].replace(/\\/g, '/');
  const idx = stripped.indexOf('/uploads/');
  const bareIdx = stripped.indexOf('uploads/');
  const logical = idx >= 0
    ? stripped.slice(idx + 1)
    : bareIdx >= 0
      ? stripped.slice(bareIdx)
      : '';
  if (!logical) return [];
  const clean = logical.replace(/^\/+/, '');
  return [clean, buildStorageKey(clean)];
}

function collectUploadRefs(value, out = new Set()) {
  if (value == null) return out;
  if (Array.isArray(value)) {
    for (const item of value) collectUploadRefs(item, out);
    return out;
  }
  if (typeof value === 'object') {
    for (const item of Object.values(value)) collectUploadRefs(item, out);
    return out;
  }
  const text = String(value || '');
  if (!text) return out;
  try {
    const parsed = JSON.parse(text);
    if (parsed && parsed !== text) collectUploadRefs(parsed, out);
  } catch {
    // 非 JSON 文本继续按普通字符串提取。
  }
  const matches = text.match(/(?:https?:\/\/[^\s"'<>),\]]+)?\/?uploads\/[^\s"'<>),\]]+/gi) || [];
  for (const match of matches) {
    for (const ref of normalizeUploadRef(match)) out.add(ref);
  }
  return out;
}

async function getReferencedUploadKeys() {
  const values = await repo.listUploadReferenceValues(REFERENCE_SOURCES);
  const refs = new Set();
  for (const value of values) collectUploadRefs(value, refs);
  return refs;
}

function walkLocalUploads(dir = UPLOAD_DIR, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    const filePath = path.join(dir, name);
    let stat;
    try {
      stat = fs.statSync(filePath);
    } catch {
      continue;
    }
    if (stat.isDirectory()) {
      walkLocalUploads(filePath, out);
      continue;
    }
    if (!stat.isFile()) continue;
    const rel = path.relative(UPLOAD_DIR, filePath).replace(/\\/g, '/');
    out.push({
      storageProvider: 'local',
      objectKey: `${UPLOAD_PREFIX}${rel}`,
      localPath: filePath,
      publicUrl: `/uploads/${rel}`,
      sizeBytes: stat.size,
      lastModifiedAt: new Date(stat.mtimeMs),
    });
  }
  return out;
}

async function listS3UploadObjects(prefix, allowRaw) {
  if (!isS3StorageEnabled()) return [];
  const objects = await listS3ObjectsByPrefix(prefix);
  return objects
    .filter((item) => isSafeUploadKey(item.key, { allowRaw }))
    .map((item) => ({
      storageProvider: 's3',
      objectKey: item.key,
      localPath: '',
      publicUrl: item.url || '',
      sizeBytes: item.size,
      lastModifiedAt: toIsoDate(item.lastModified),
    }));
}

async function previewRawUploadObjects(policy, previewRunId) {
  const cutoff = cutoffMs(policy.retentionDays);
  const objects = (await listS3UploadObjects(RAW_UPLOAD_PREFIX, true))
    .filter((item) => item.lastModifiedAt && item.lastModifiedAt.getTime() < cutoff);
  await repo.clearFileCandidates(previewRunId, policy.policyKey);
  await repo.insertFileCandidates(objects.map((item) => ({
    ...item,
    previewRunId,
    policyKey: policy.policyKey,
    status: 'candidate',
  })));
  return objects;
}

async function previewOrphanUploadFiles(policy, previewRunId) {
  const cutoff = cutoffMs(policy.retentionDays);
  const refs = await getReferencedUploadKeys();
  const localFiles = walkLocalUploads()
    .filter((item) => item.lastModifiedAt && item.lastModifiedAt.getTime() < cutoff)
    .filter((item) => !refs.has(item.objectKey));
  const s3Files = (await listS3UploadObjects(UPLOAD_PREFIX, false))
    .filter((item) => item.lastModifiedAt && item.lastModifiedAt.getTime() < cutoff)
    .filter((item) => !refs.has(item.objectKey));
  const candidates = [...localFiles, ...s3Files];
  await repo.clearFileCandidates(previewRunId, policy.policyKey);
  await repo.insertFileCandidates(candidates.map((item) => ({
    ...item,
    previewRunId,
    policyKey: policy.policyKey,
    status: 'candidate',
  })));
  return candidates;
}

async function previewPolicy(policy, previewRunId) {
  if (policy.policyKey === 'raw_upload_objects') {
    return previewRawUploadObjects(policy, previewRunId);
  }
  if (policy.policyKey === 'orphan_upload_files_preview' || policy.policyKey === 'orphan_upload_files_run') {
    return previewOrphanUploadFiles(policy, previewRunId);
  }
  return [];
}

async function deleteCandidate(candidate, { dryRun = false } = {}) {
  if (candidate.storage_provider === 'local') {
    assertSafeLocalUploadPath(candidate.local_path);
    if (!dryRun) await fs.promises.rm(candidate.local_path, { force: true });
    return;
  }
  if (candidate.storage_provider === 's3') {
    const allowRaw = String(candidate.object_key || '').includes(RAW_UPLOAD_PREFIX);
    if (!isSafeUploadKey(candidate.object_key, { allowRaw })) throw new Error('UNSAFE_S3_UPLOAD_KEY');
    let lastError = null;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const result = await deleteS3ObjectsBatch([candidate.object_key], { dryRun });
        if (!result.errors?.length) return;
        lastError = new Error(result.errors[0].message || 'S3_DELETE_FAILED');
      } catch (error) {
        lastError = error;
      }
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
    throw lastError || new Error('S3_DELETE_FAILED');
  }
}

async function executePolicy(policy, runId, previewRunId, shouldCancel = async () => false) {
  if (policy.policyKey === 'orphan_upload_files_preview') {
    return { matched: 0, deleted: 0, failed: 0, cancelled: false, batchCount: 0, sampleIds: [], errors: ['PREVIEW_ONLY_POLICY'] };
  }
  const candidates = await repo.listFileCandidates(previewRunId, policy.policyKey, ['candidate']);
  let deleted = 0;
  let failed = 0;
  let batchCount = 0;
  let cancelled = false;
  const errors = [];
  for (let i = 0; i < candidates.length; i += policy.batchSize) {
    if (await shouldCancel()) {
      cancelled = true;
      break;
    }
    batchCount += 1;
    const batch = candidates.slice(i, i + policy.batchSize);
    for (const candidate of batch) {
      try {
        await deleteCandidate(candidate, { dryRun: false });
        await repo.updateFileCandidate(candidate.id, { status: 'deleted' });
        deleted += 1;
      } catch (error) {
        failed += 1;
        const message = error?.message || String(error);
        errors.push(`${candidate.object_key || candidate.local_path}: ${message}`);
        await repo.updateFileCandidate(candidate.id, { status: 'failed', errorMessage: message });
      }
    }
  }
  return {
    matched: candidates.length,
    deleted,
    failed,
    cancelled,
    batchCount,
    sampleIds: candidates.slice(0, 10).map((item) => item.public_url || item.object_key || item.local_path),
    errors,
  };
}

module.exports = {
  REFERENCE_SOURCES,
  executePolicy,
  previewPolicy,
  __test: {
    collectUploadRefs,
    normalizeUploadRef,
    isSafeUploadKey,
  },
};

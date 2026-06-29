const crypto = require('crypto');
const repo = require('../repository/uploadAsset.repository');

const KNOWN_PURPOSES = new Set(['product', 'banner', 'thumb', 'asset', 'video', 'site_asset']);

function truncate(value, max) {
  const raw = String(value || '');
  return raw.length > max ? raw.slice(0, max) : raw;
}

function normalizePurpose(purpose, mediaType = 'image') {
  const raw = String(purpose || '').toLowerCase().trim();
  if (KNOWN_PURPOSES.has(raw)) return raw;
  if (raw === 'image' || raw === 'auto') return mediaType === 'video' ? 'video' : 'product';
  return mediaType === 'video' ? 'video' : 'asset';
}

function normalizeUploaderType(value) {
  const raw = String(value || '').toLowerCase().trim();
  if (raw === 'admin' || raw === 'system') return raw;
  return 'user';
}

function inferStorageProvider({ storageProvider, publicUrl, storageKey }) {
  const explicit = String(storageProvider || '').toLowerCase().trim();
  if (explicit) return explicit;
  const url = String(publicUrl || '').toLowerCase();
  const key = String(storageKey || '').toLowerCase();
  if (url.startsWith('data:')) return 'db-inline';
  if (url.startsWith('/uploads/') || key.startsWith('uploads/')) return 'local';
  if (url.includes('.cloudfront.net') || url.includes('.amazonaws.com') || url.includes('.r2.dev')) return 's3';
  if (/^https?:\/\//i.test(url)) return 'cdn';
  return 'local';
}

function checksumSha256(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) return '';
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

function normalizeAssetInput(input) {
  const mediaType = String(input.mediaType || 'image').toLowerCase() === 'video' ? 'video' : 'image';
  const purpose = normalizePurpose(input.purpose, mediaType);
  const storageProvider = inferStorageProvider(input);
  return {
    id: input.id || crypto.randomUUID(),
    assetGroupId: input.assetGroupId || input.id || crypto.randomUUID(),
    uploaderId: input.uploaderId || null,
    uploaderType: normalizeUploaderType(input.uploaderType),
    uploadSource: truncate(input.uploadSource || 'multipart', 64),
    purpose,
    mediaType,
    mimeType: truncate(input.mimeType || '', 100),
    originalMimeType: truncate(input.originalMimeType || input.mimeType || '', 100),
    originalFilename: truncate(input.originalFilename || '', 255),
    filename: truncate(input.filename || '', 255),
    storageProvider: truncate(storageProvider, 32),
    storageKey: truncate(input.storageKey || '', 1024),
    sourceStorageKey: truncate(input.sourceStorageKey || '', 1024),
    publicUrl: truncate(input.publicUrl || input.url || '', 2000),
    variantTag: truncate(input.variantTag || 'full', 32),
    status: truncate(input.status || 'ready', 32),
    sizeBytes: Math.max(0, Number(input.sizeBytes || 0)),
    width: input.width == null ? null : Math.max(0, Number(input.width || 0)),
    height: input.height == null ? null : Math.max(0, Number(input.height || 0)),
    durationSeconds: input.durationSeconds == null ? null : Math.max(0, Number(input.durationSeconds || 0)),
    checksumSha256: truncate(input.checksumSha256 || checksumSha256(input.buffer), 64),
    metadata: input.metadata && typeof input.metadata === 'object' ? input.metadata : null,
    processingError: truncate(input.processingError || '', 1000),
  };
}

async function recordUploadedAsset(input) {
  const asset = normalizeAssetInput(input || {});
  await repo.insertUploadedAsset(asset);
  return asset;
}

async function safeRecordUploadedAsset(input) {
  try {
    return await recordUploadedAsset(input);
  } catch (error) {
    const code = String(error?.code || '');
    const message = error?.message || String(error);
    console.warn(`[uploaded_assets] record skipped: ${code || message}`);
    return null;
  }
}

async function selectPendingVideoTranscodeAssets(limit) {
  return repo.selectPendingVideoTranscodeAssets(limit);
}

async function claimVideoTranscodeAsset(id) {
  return repo.claimVideoTranscodeAsset(id);
}

async function markVideoTranscodeReady(id, metadata) {
  return repo.markVideoTranscodeReady(id, metadata);
}

async function markVideoTranscodeFailed(id, errorMessage, metadata = {}) {
  return repo.markVideoTranscodeFailed(id, errorMessage, metadata);
}

async function replaceProductVideoUrl(oldUrls, newUrl) {
  return repo.replaceProductVideoUrl(oldUrls, newUrl);
}

module.exports = {
  inferStorageProvider,
  normalizeAssetInput,
  normalizePurpose,
  recordUploadedAsset,
  safeRecordUploadedAsset,
  selectPendingVideoTranscodeAssets,
  claimVideoTranscodeAsset,
  markVideoTranscodeReady,
  markVideoTranscodeFailed,
  replaceProductVideoUrl,
};

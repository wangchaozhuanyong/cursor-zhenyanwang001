const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const sharp = require('sharp');
const { isS3StorageEnabled, uploadBufferToS3 } = require('../../../utils/objectStorage');
const { normalizeImageMode, optimizeImageFile } = require('../../../utils/imageOptimize');
const { bufferMatchesDeclaredMime } = require('../../../utils/fileMagic');
const { safeRecordUploadedAsset } = require('./uploadAsset.service');

const uploadDir = path.join(__dirname, '../../../../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const IMAGE_MAX_SIZE = 15 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;
const IMAGE_MAX_PIXELS = 25_000_000;

const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];
const allowedImageExts = /\.(jpg|jpeg|png|webp|gif|avif)$/i;
const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
const allowedVideoExts = /\.(mp4|webm|mov|m4v)$/i;

function badRequest(message) {
  const err = new Error(message);
  /** @type {any} */ (err).statusCode = 400;
  /** @type {any} */ (err).expose = true;
  return err;
}

function formatMB(size) {
  return `${(Number(size || 0) / 1024 / 1024).toFixed(2)}MB`;
}

function isImageFile(file) {
  return allowedImageExts.test(path.extname(file.originalname)) && allowedImageMimes.includes(file.mimetype);
}

function isVideoFile(file) {
  return allowedVideoExts.test(path.extname(file.originalname)) && allowedVideoMimes.includes(file.mimetype);
}

function assertMagicBytes(file) {
  if (!file?.buffer?.length) throw badRequest('Invalid file content');
  if (!bufferMatchesDeclaredMime(file.buffer, file.mimetype)) {
    throw badRequest('File content does not match declared mime type');
  }
}

async function assertImageDimensions(file) {
  let meta;
  try {
    meta = await sharp(file.buffer).metadata();
  } catch {
    throw badRequest('Image cannot be parsed, please upload a valid image');
  }
  const pixels = (meta.width || 0) * (meta.height || 0);
  if (!pixels || pixels > IMAGE_MAX_PIXELS) {
    throw badRequest('Image resolution too large');
  }
}

async function persistBuffer(filename, buffer, contentType = 'image/webp') {
  if (isS3StorageEnabled()) {
    const uploaded = await uploadBufferToS3({
      key: `uploads/${filename}`,
      body: buffer,
      contentType,
      cacheControl: 'public, max-age=31536000, immutable',
    });
    return {
      filename,
      url: uploaded.url,
      storageProvider: 's3',
      storageKey: uploaded.key,
      sizeBytes: buffer.length,
      contentType,
    };
  }
  const outPath = path.join(uploadDir, filename);
  await fs.promises.writeFile(outPath, buffer);
  return {
    filename,
    url: `/uploads/${filename}`,
    storageProvider: 'local',
    storageKey: `uploads/${filename}`,
    sizeBytes: buffer.length,
    contentType,
  };
}

async function writeImageFromFile(file, mode = 'product', context = {}) {
  if (file.size > IMAGE_MAX_SIZE) throw badRequest('图片大小不能超过 15MB');
  assertMagicBytes(file);
  await assertImageDimensions(file);
  const traceId = crypto.randomUUID();
  const startedAt = Date.now();
  const normalizedMode = normalizeImageMode(mode);
  const assetGroupId = context.assetGroupId || crypto.randomUUID();

  const sharpStartedAt = Date.now();
  let optimized;
  try {
    optimized = await optimizeImageFile(file, normalizedMode);
  } catch (_error) {
    throw badRequest('Image cannot be parsed, please upload a valid image');
  }
  const sharpCost = Date.now() - sharpStartedAt;

  const uploaded = [];
  for (const item of optimized.files) {
    // eslint-disable-next-line no-await-in-loop
    const saved = await persistBuffer(item.filename, item.buffer);
    uploaded.push({ ...saved, tag: item.tag });
    // eslint-disable-next-line no-await-in-loop
    await safeRecordUploadedAsset({
      assetGroupId,
      uploaderId: context.uploaderId,
      uploaderType: context.uploaderType,
      uploadSource: context.uploadSource || 'multipart',
      purpose: normalizedMode,
      mediaType: 'image',
      mimeType: saved.contentType,
      originalMimeType: file.mimetype,
      originalFilename: file.originalname,
      filename: saved.filename,
      storageProvider: saved.storageProvider,
      storageKey: saved.storageKey,
      sourceStorageKey: context.sourceStorageKey,
      publicUrl: saved.url,
      variantTag: item.tag || 'full',
      status: 'ready',
      sizeBytes: item.buffer.length,
      buffer: item.buffer,
      metadata: {
        mode: normalizedMode,
        originalSizeBytes: file.size,
        primary: item.tag === optimized.primaryTag,
        traceId,
      },
    });
  }

  const primary =
    uploaded.find((u) => u.tag === optimized.primaryTag) || uploaded[uploaded.length - 1];
  const totalBytes = optimized.files.reduce((sum, f) => sum + f.buffer.length, 0);

  console.info(
    `[upload] traceId=${traceId} mode=${normalizedMode} type=${file.mimetype} original=${formatMB(file.size)} optimized=${formatMB(totalBytes)} variants=${uploaded.length} sharp=${sharpCost}ms total=${Date.now() - startedAt}ms`,
  );

  return {
    filename: primary.filename,
    url: primary.url,
    storageProvider: primary.storageProvider,
    storageKey: primary.storageKey,
    variants: uploaded.reduce((acc, u) => {
      if (u.tag) acc[u.tag] = u.url;
      return acc;
    }, {}),
  };
}

async function writeVideoFromFile(file, context = {}) {
  if (file.size > VIDEO_MAX_SIZE) throw badRequest('视频大小不能超过 50MB');
  assertMagicBytes(file);
  const ext = path.extname(file.originalname).toLowerCase();
  const safeExt = allowedVideoExts.test(ext) ? ext : '.mp4';
  const filename = `${crypto.randomBytes(16).toString('hex')}${safeExt}`;
  const traceId = crypto.randomUUID();
  const startedAt = Date.now();

  if (isS3StorageEnabled()) {
    const s3StartedAt = Date.now();
    const uploaded = await uploadBufferToS3({
      key: `uploads/videos/${filename}`,
      body: file.buffer,
      contentType: file.mimetype || 'video/mp4',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    const s3Cost = Date.now() - s3StartedAt;
    console.info(`[upload] traceId=${traceId} type=${file.mimetype} original=${formatMB(file.size)} optimized=${formatMB(file.size)} sharp=0ms s3=${s3Cost}ms total=${Date.now() - startedAt}ms`);
    await safeRecordUploadedAsset({
      assetGroupId: context.assetGroupId,
      uploaderId: context.uploaderId,
      uploaderType: context.uploaderType,
      uploadSource: context.uploadSource || 'multipart',
      purpose: 'video',
      mediaType: 'video',
      mimeType: file.mimetype || 'video/mp4',
      originalMimeType: file.mimetype,
      originalFilename: file.originalname,
      filename,
      storageProvider: 's3',
      storageKey: uploaded.key,
      sourceStorageKey: context.sourceStorageKey,
      publicUrl: uploaded.url,
      variantTag: 'original',
      status: 'ready',
      sizeBytes: file.size,
      buffer: file.buffer,
      metadata: {
        processing: 'passthrough',
        transcodeRequired: true,
        traceId,
      },
    });
    return {
      filename,
      url: uploaded.url,
      storageProvider: 's3',
      storageKey: uploaded.key,
    };
  }

  const outPath = path.join(uploadDir, filename);
  await fs.promises.writeFile(outPath, file.buffer);
  console.info(`[upload] traceId=${traceId} type=${file.mimetype} original=${formatMB(file.size)} optimized=${formatMB(file.size)} sharp=0ms s3=0ms total=${Date.now() - startedAt}ms`);
  await safeRecordUploadedAsset({
    assetGroupId: context.assetGroupId,
    uploaderId: context.uploaderId,
    uploaderType: context.uploaderType,
    uploadSource: context.uploadSource || 'multipart',
    purpose: 'video',
    mediaType: 'video',
    mimeType: file.mimetype || 'video/mp4',
    originalMimeType: file.mimetype,
    originalFilename: file.originalname,
    filename,
    storageProvider: 'local',
    storageKey: `uploads/${filename}`,
    sourceStorageKey: context.sourceStorageKey,
    publicUrl: `/uploads/${filename}`,
    variantTag: 'original',
    status: 'ready',
    sizeBytes: file.size,
    buffer: file.buffer,
    metadata: {
      processing: 'passthrough',
      transcodeRequired: true,
      traceId,
    },
  });
  return {
    filename,
    url: `/uploads/${filename}`,
    storageProvider: 'local',
    storageKey: `uploads/${filename}`,
  };
}

async function writeMediaFromFile(file, mode = 'auto', context = {}) {
  if (isVideoFile(file)) return writeVideoFromFile(file, context);
  const imageMode = mode === 'banner' ? 'banner' : normalizeImageMode(mode);
  return writeImageFromFile(file, imageMode, context);
}

module.exports = {
  IMAGE_MAX_SIZE,
  VIDEO_MAX_SIZE,
  allowedImageMimes,
  allowedVideoMimes,
  isImageFile,
  isVideoFile,
  badRequest,
  writeMediaFromFile,
};

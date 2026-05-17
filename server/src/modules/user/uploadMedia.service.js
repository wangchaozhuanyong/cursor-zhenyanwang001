const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const sharp = require('sharp');
const { isS3StorageEnabled, uploadBufferToS3 } = require('../../utils/objectStorage');
const { normalizeImageMode, optimizeImageFile } = require('../../utils/imageOptimize');
const { bufferMatchesDeclaredMime } = require('../../utils/fileMagic');

const uploadDir = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const IMAGE_MAX_SIZE = 15 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;
const IMAGE_MAX_PIXELS = 25_000_000;

const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedImageExts = /\.(jpg|jpeg|png|webp)$/i;
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
  if (!file?.buffer?.length) throw badRequest('文件内容无效');
  if (!bufferMatchesDeclaredMime(file.buffer, file.mimetype)) {
    throw badRequest('文件内容与类型不符，请上传真实的图片或视频文件');
  }
}

async function assertImageDimensions(file) {
  let meta;
  try {
    meta = await sharp(file.buffer).metadata();
  } catch {
    throw badRequest('图片文件无法解析，请更换图片后重试');
  }
  const pixels = (meta.width || 0) * (meta.height || 0);
  if (!pixels || pixels > IMAGE_MAX_PIXELS) {
    throw badRequest(`图片分辨率过大（最大约 ${Math.floor(IMAGE_MAX_PIXELS / 1_000_000)}MP）`);
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
    return { filename, url: uploaded.url };
  }
  const outPath = path.join(uploadDir, filename);
  await fs.promises.writeFile(outPath, buffer);
  return { filename, url: `/uploads/${filename}` };
}

async function writeImageFromFile(file, mode = 'product') {
  if (file.size > IMAGE_MAX_SIZE) throw badRequest('图片大小不能超过 15MB');
  assertMagicBytes(file);
  await assertImageDimensions(file);
  const traceId = crypto.randomUUID();
  const startedAt = Date.now();
  const normalizedMode = normalizeImageMode(mode);

  const sharpStartedAt = Date.now();
  let optimized;
  try {
    optimized = await optimizeImageFile(file, normalizedMode);
  } catch (_error) {
    throw badRequest('图片文件无法解析，请更换图片后重试');
  }
  const sharpCost = Date.now() - sharpStartedAt;

  const uploaded = [];
  for (const item of optimized.files) {
    // eslint-disable-next-line no-await-in-loop
    const saved = await persistBuffer(item.filename, item.buffer);
    uploaded.push({ ...saved, tag: item.tag });
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
    variants: uploaded.reduce((acc, u) => {
      if (u.tag) acc[u.tag] = u.url;
      return acc;
    }, {}),
  };
}

async function writeVideoFromFile(file) {
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
    return { filename, url: uploaded.url };
  }

  const outPath = path.join(uploadDir, filename);
  await fs.promises.writeFile(outPath, file.buffer);
  console.info(`[upload] traceId=${traceId} type=${file.mimetype} original=${formatMB(file.size)} optimized=${formatMB(file.size)} sharp=0ms s3=0ms total=${Date.now() - startedAt}ms`);
  return { filename, url: `/uploads/${filename}` };
}

async function writeMediaFromFile(file, mode = 'auto') {
  if (isVideoFile(file)) return writeVideoFromFile(file);
  const imageMode = mode === 'banner' ? 'banner' : normalizeImageMode(mode);
  return writeImageFromFile(file, imageMode);
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

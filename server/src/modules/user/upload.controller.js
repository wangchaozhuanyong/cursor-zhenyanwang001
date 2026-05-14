const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const sharp = require('sharp');
const { isS3StorageEnabled, uploadBufferToS3 } = require('../../utils/objectStorage');

const uploadDir = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const IMAGE_MAX_SIZE = 15 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;
const UPLOAD_CONCURRENCY = 3;

const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const allowedImageExts = /\.(jpg|jpeg|png|webp|gif)$/i;
const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
const allowedVideoExts = /\.(mp4|webm|mov|m4v)$/i;

function badRequest(message) {
  const err = new Error(message);
  err.statusCode = 400;
  err.expose = true;
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

const fileFilter = (_req, file, cb) => {
  if (isImageFile(file) || isVideoFile(file)) {
    cb(null, true);
  } else {
    cb(badRequest('只允许上传图片或视频文件（图片：JPG/PNG/WebP/GIF；视频：MP4/WebM/MOV）'));
  }
};

async function writeImageFromFile(file) {
  if (file.size > IMAGE_MAX_SIZE) throw badRequest('图片大小不能超过 15MB');
  const traceId = crypto.randomUUID();
  const startedAt = Date.now();
  const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;

  const sharpStartedAt = Date.now();
  let webpBuffer = null;
  try {
    webpBuffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 82, effort: 3 })
      .toBuffer();
  } catch (_error) {
    throw badRequest('图片文件无法解析，请更换图片后重试');
  }
  const sharpCost = Date.now() - sharpStartedAt;

  if (isS3StorageEnabled()) {
    const s3StartedAt = Date.now();
    const uploaded = await uploadBufferToS3({
      key: `uploads/${filename}`,
      body: webpBuffer,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    const s3Cost = Date.now() - s3StartedAt;
    console.info(`[upload] traceId=${traceId} type=${file.mimetype} original=${formatMB(file.size)} optimized=${formatMB(webpBuffer.length)} sharp=${sharpCost}ms s3=${s3Cost}ms total=${Date.now() - startedAt}ms`);
    return { filename, url: uploaded.url };
  }

  const outPath = path.join(uploadDir, filename);
  await fs.promises.writeFile(outPath, webpBuffer);
  console.info(`[upload] traceId=${traceId} type=${file.mimetype} original=${formatMB(file.size)} optimized=${formatMB(webpBuffer.length)} sharp=${sharpCost}ms s3=0ms total=${Date.now() - startedAt}ms`);
  return { filename, url: `/uploads/${filename}` };
}

async function writeVideoFromFile(file) {
  if (file.size > VIDEO_MAX_SIZE) throw badRequest('视频大小不能超过 50MB');
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

async function writeMediaFromFile(file) {
  if (isVideoFile(file)) return writeVideoFromFile(file);
  return writeImageFromFile(file);
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: VIDEO_MAX_SIZE },
});

exports.uploadMiddleware = upload.single('file');
exports.uploadMultiple = upload.array('files', 10);

exports.uploadFile = async (req, res) => {
  if (!req.file || !req.file.buffer) return res.fail(400, '请选择要上传的文件');
  try {
    const { url, filename } = await writeMediaFromFile(req.file);
    return res.success({ url, filename });
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.fail(statusCode, error instanceof Error ? error.message : '文件处理失败');
  }
};

exports.uploadFiles = async (req, res) => {
  if (!req.files || !req.files.length) return res.fail(400, '请选择要上传的文件');
  try {
    const queue = [...req.files];
    const result = [];
    const workers = Array.from({ length: Math.min(UPLOAD_CONCURRENCY, queue.length) }).map(async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        // eslint-disable-next-line no-await-in-loop
        const uploaded = await writeMediaFromFile(next);
        result.push(uploaded);
      }
    });
    await Promise.all(workers);
    return res.success(result.map(({ url, filename }) => ({ url, filename })));
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    return res.fail(statusCode, error instanceof Error ? error.message : '文件处理失败');
  }
};

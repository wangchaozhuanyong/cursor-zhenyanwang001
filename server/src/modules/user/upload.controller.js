const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const sharp = require('sharp');
const { isS3StorageEnabled, uploadBufferToS3 } = require('../../utils/objectStorage');

const uploadDir = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const IMAGE_MAX_SIZE = 15 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;

const allowedImageMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const allowedImageExts = /\.(jpg|jpeg|png|webp|gif)$/i;
const allowedVideoMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'];
const allowedVideoExts = /\.(mp4|webm|mov|m4v)$/i;

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
    cb(new Error('只允许上传图片或视频文件（图片：jpg/png/webp/gif；视频：mp4/webm/mov）'));
  }
};

async function writeImageFromFile(file) {
  if (file.size > IMAGE_MAX_SIZE) {
    throw new Error('图片大小不能超过 15MB');
  }
  const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
  const webpBuffer = await sharp(file.buffer)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82, effort: 3 })
    .toBuffer();

  if (isS3StorageEnabled()) {
    const uploaded = await uploadBufferToS3({
      key: `uploads/${filename}`,
      body: webpBuffer,
      contentType: 'image/webp',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    return { filename, url: uploaded.url };
  }

  const outPath = path.join(uploadDir, filename);
  await fs.promises.writeFile(outPath, webpBuffer);
  return { filename, url: `/uploads/${filename}` };
}

async function writeVideoFromFile(file) {
  if (file.size > VIDEO_MAX_SIZE) {
    throw new Error('视频大小不能超过 50MB');
  }
  const ext = path.extname(file.originalname).toLowerCase();
  const safeExt = allowedVideoExts.test(ext) ? ext : '.mp4';
  const filename = `${crypto.randomBytes(16).toString('hex')}${safeExt}`;

  if (isS3StorageEnabled()) {
    const uploaded = await uploadBufferToS3({
      key: `uploads/videos/${filename}`,
      body: file.buffer,
      contentType: file.mimetype || 'video/mp4',
      cacheControl: 'public, max-age=31536000, immutable',
    });
    return { filename, url: uploaded.url };
  }

  const outPath = path.join(uploadDir, filename);
  await fs.promises.writeFile(outPath, file.buffer);
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

exports.uploadFile = async (req, res) => {
  if (!req.file || !req.file.buffer) return res.fail(400, '请选择要上传的文件');
  try {
    const { url, filename } = await writeMediaFromFile(req.file);
    res.success({ url, filename });
  } catch (e) {
    res.fail(500, e instanceof Error ? e.message : '文件处理失败');
  }
};

exports.uploadMultiple = upload.array('files', 10);

exports.uploadFiles = async (req, res) => {
  if (!req.files || !req.files.length) return res.fail(400, '请选择要上传的文件');
  try {
    const files = await Promise.all(
      req.files.map((f) => writeMediaFromFile(f)),
    );
    res.success(files.map(({ url, filename }) => ({ url, filename })));
  } catch (e) {
    res.fail(500, e instanceof Error ? e.message : '文件处理失败');
  }
};

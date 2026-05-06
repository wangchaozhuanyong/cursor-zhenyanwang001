const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const sharp = require('sharp');

const uploadDir = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
const allowedExts = /\.(jpg|jpeg|png|webp)$/i;

const fileFilter = (_req, file, cb) => {
  if (allowedExts.test(path.extname(file.originalname)) && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (jpg, png, webp)'));
  }
};

async function writeWebpFromBuffer(buf, opts = {}) {
  const filename = `${crypto.randomBytes(16).toString('hex')}.webp`;
  const outPath = path.join(uploadDir, filename);
  await sharp(buf)
    .rotate()
    .resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 82 })
    .toFile(outPath);
  return { filename, url: `/uploads/${filename}` };
}

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

exports.uploadMiddleware = upload.single('file');

exports.uploadFile = async (req, res) => {
  if (!req.file || !req.file.buffer) return res.fail(400, '请选择要上传的文件');
  try {
    const { url, filename } = await writeWebpFromBuffer(req.file.buffer);
    res.success({ url, filename });
  } catch (e) {
    res.fail(500, e instanceof Error ? e.message : '图片转换失败');
  }
};

exports.uploadMultiple = upload.array('files', 10);

exports.uploadFiles = async (req, res) => {
  if (!req.files || !req.files.length) return res.fail(400, '请选择要上传的文件');
  try {
    const files = await Promise.all(
      req.files.map((f) => writeWebpFromBuffer(f.buffer)),
    );
    res.success(files.map(({ url, filename }) => ({ url, filename })));
  } catch (e) {
    res.fail(500, e instanceof Error ? e.message : '图片转换失败');
  }
};

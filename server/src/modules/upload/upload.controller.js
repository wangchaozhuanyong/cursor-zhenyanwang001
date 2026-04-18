const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const uploadDir = path.join(__dirname, '../../../public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  },
});

const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const allowedExts = /\.(jpg|jpeg|png|gif|webp)$/i;

const fileFilter = (_req, file, cb) => {
  if (allowedExts.test(path.extname(file.originalname)) && allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件 (jpg, png, gif, webp)'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
});

exports.uploadMiddleware = upload.single('file');

exports.uploadFile = (req, res) => {
  if (!req.file) return res.fail(400, '请选择要上传的文件');
  const url = `/uploads/${req.file.filename}`;
  res.success({ url, filename: req.file.filename });
};

exports.uploadMultiple = upload.array('files', 10);

exports.uploadFiles = (req, res) => {
  if (!req.files || !req.files.length) return res.fail(400, '请选择要上传的文件');
  const files = req.files.map((f) => ({
    url: `/uploads/${f.filename}`,
    filename: f.filename,
  }));
  res.success(files);
};

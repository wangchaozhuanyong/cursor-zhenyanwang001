const multer = require('multer');
const { writeAuditLog } = require('../../../utils/auditLog');
const {
  IMAGE_MAX_SIZE,
  VIDEO_MAX_SIZE,
  isImageFile,
  isVideoFile,
  badRequest,
  writeMediaFromFile,
} = require('./uploadMedia.service');

const BATCH_MAX_FILES = 5;
const DEFAULT_UPLOAD_MEMORY_BUDGET = 80 * 1024 * 1024;
let inFlightUploadBytes = 0;

function positiveNumber(value, fallback) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

const UPLOAD_MEMORY_BUDGET = Math.max(
  VIDEO_MAX_SIZE,
  positiveNumber(process.env.UPLOAD_MEMORY_BUDGET_BYTES, DEFAULT_UPLOAD_MEMORY_BUDGET),
);

function fileFilter(_req, file, cb) {
  if (isImageFile(file) || isVideoFile(file)) {
    cb(null, true);
  } else {
    cb(badRequest('仅支持图片或视频文件上传'));
  }
}

function parseContentLength(req) {
  const value = Number(req.get('content-length') || 0);
  return Number.isFinite(value) && value > 0 ? value : 0;
}

function guardUploadPressure(req, res, next) {
  const contentLength = parseContentLength(req);
  if (contentLength > VIDEO_MAX_SIZE) {
    return res.fail(413, '上传文件过大');
  }

  const reservedBytes = contentLength || VIDEO_MAX_SIZE;
  if (inFlightUploadBytes + reservedBytes > UPLOAD_MEMORY_BUDGET) {
    return res.fail(429, '上传任务过多，请稍后再试');
  }

  inFlightUploadBytes += reservedBytes;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    inFlightUploadBytes = Math.max(0, inFlightUploadBytes - reservedBytes);
  };
  res.on('finish', release);
  res.on('close', release);
  next();
}

const uploadSingle = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: VIDEO_MAX_SIZE },
});

const uploadBatch = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    if (isImageFile(file)) cb(null, true);
    else cb(badRequest('批量上传仅支持图片文件'));
  },
  limits: { fileSize: IMAGE_MAX_SIZE, files: BATCH_MAX_FILES },
});

function composeUploadMiddleware(middleware) {
  return (req, res, next) => guardUploadPressure(req, res, (err) => {
    if (err) return next(err);
    return middleware(req, res, next);
  });
}

function buildUploadContext(req, uploadSource) {
  const originalUrl = String(req.originalUrl || req.url || '');
  return {
    uploaderId: req.user?.id || null,
    uploaderType: originalUrl.startsWith('/api/admin/') ? 'admin' : 'user',
    uploadSource,
  };
}

const uploadMiddleware = composeUploadMiddleware(uploadSingle.single('file'));
const uploadMultiple = composeUploadMiddleware(uploadBatch.array('files', BATCH_MAX_FILES));

async function auditUpload(req, result, errorMessage) {
  await writeAuditLog({
    req,
    operatorId: req.user?.id,
    actionType: 'upload.media',
    objectType: 'upload',
    objectId: result?.filename || null,
    summary: errorMessage
      ? '用户上传失败'
      : `用户上传 ${result?.filename || 'media'}`,
    after: result ? { url: result.url, filename: result.filename } : undefined,
    result: errorMessage ? 'failure' : 'success',
    errorMessage,
  });
}

async function uploadFile(req, res) {
  if (!req.file || !req.file.buffer) return res.fail(400, '请选择要上传的文件');
  try {
    const mode = String(req.body?.mode || req.query?.mode || 'product').toLowerCase();
    const result = await writeMediaFromFile(req.file, mode, buildUploadContext(req, 'multipart'));
    await auditUpload(req, result);
    return res.success(result);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    const message = error instanceof Error ? error.message : '文件处理失败';
    await auditUpload(req, null, message);
    return res.fail(statusCode, message);
  }
}

async function uploadFiles(req, res) {
  if (!req.files || !req.files.length) return res.fail(400, '请选择要上传的文件');
  try {
    const mode = String(req.body?.mode || req.query?.mode || 'product').toLowerCase();
    const result = [];
    for (const file of req.files) {
      // Sequential processing keeps peak memory near one file buffer at a time.
      // eslint-disable-next-line no-await-in-loop
      const uploaded = await writeMediaFromFile(file, mode, buildUploadContext(req, 'multipart_batch'));
      result.push(uploaded);
    }
    await writeAuditLog({
      req,
      operatorId: req.user?.id,
      actionType: 'upload.media_batch',
      objectType: 'upload',
      summary: `用户批量上传 ${result.length} 个文件`,
      after: { count: result.length },
      result: 'success',
    });
    return res.success(
      result.map(({ url, filename, variants }) => ({ url, filename, variants })),
    );
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    const message = error instanceof Error ? error.message : '文件处理失败';
    await auditUpload(req, null, message);
    return res.fail(statusCode, message);
  }
}

module.exports = {
  uploadMiddleware,
  uploadMultiple,
  uploadFile,
  uploadFiles,
};

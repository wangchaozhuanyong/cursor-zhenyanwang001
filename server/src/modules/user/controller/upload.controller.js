const multer = require('multer');
const { writeAuditLog } = require('../../../utils/auditLog');
const {
  IMAGE_MAX_SIZE,
  VIDEO_MAX_SIZE,
  isImageFile,
  isVideoFile,
  badRequest,
  writeMediaFromFile,
} = require('../service/uploadMedia.service');

const fileFilter = (_req, file, cb) => {
  if (isImageFile(file) || isVideoFile(file)) {
    cb(null, true);
  } else {
    cb(badRequest('仅支持图片或视频文件上传'));
  }
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: { fileSize: VIDEO_MAX_SIZE },
});

exports.uploadMiddleware = upload.single('file');
exports.uploadMultiple = upload.array('files', 10);

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

exports.uploadFile = async (req, res) => {
  if (!req.file || !req.file.buffer) return res.fail(400, '请选择要上传的文件');
  try {
    const mode = String(req.body?.mode || req.query?.mode || 'product').toLowerCase();
    const result = await writeMediaFromFile(req.file, mode);
    await auditUpload(req, result);
    return res.success(result);
  } catch (error) {
    const statusCode = Number(error?.statusCode || 500);
    const message = error instanceof Error ? error.message : '文件处理失败';
    await auditUpload(req, null, message);
    return res.fail(statusCode, message);
  }
};

exports.uploadFiles = async (req, res) => {
  if (!req.files || !req.files.length) return res.fail(400, '请选择要上传的文件');
  try {
    const mode = String(req.body?.mode || req.query?.mode || 'product').toLowerCase();
    const queue = [...req.files];
    const result = [];
    const workers = Array.from({ length: Math.min(3, queue.length) }).map(async () => {
      while (queue.length > 0) {
        const next = queue.shift();
        if (!next) break;
        // eslint-disable-next-line no-await-in-loop
        const uploaded = await writeMediaFromFile(next, mode);
        result.push(uploaded);
      }
    });
    await Promise.all(workers);
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
};



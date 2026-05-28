const { ZodError } = require('zod');
const { AppError, ServiceUnavailableError } = require('../errors');
const { isSchemaDriftError } = require('../db/schemaErrors');
const { appendRuntimeError } = require('../lib/serverErrorLog');

function isUploadTypeError(message) {
  const raw = String(message || '');
  return (
    raw.includes('只允许上传图片或视频文件')
    || raw.includes('只允许上传图片文件')
    || raw.includes('仅支持')
    || raw.includes('文件类型不支持')
    || raw.includes('图片文件无法解析')
  );
}

module.exports = function errorHandler(err, req, res, _next) {
  const traceId = req.traceId || '';

  if (err instanceof ZodError) {
    const message = err.issues
      .map((iss) => `${iss.path.length ? iss.path.join('.') : '(root)'}: ${iss.message}`)
      .join('；');
    return res.status(400).json({ code: 400, message: message || '参数校验失败', data: null, traceId });
  }

  if (err?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: 400, message: '文件大小超出限制', data: null, traceId });
  }
  if (err?.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ code: 400, message: '上传字段名不正确（应为 file 或 files）', data: null, traceId });
  }
  if (isUploadTypeError(err?.message)) {
    return res.status(400).json({ code: 400, message: err.message, data: null, traceId });
  }

  if (err instanceof AppError || err?.name === 'BusinessError') {
    const statusCode = Number(err.statusCode || err.code || 400);
    return res.status(statusCode).json({
      code: statusCode,
      message: err.message || '请求失败',
      data: err.details ?? null,
      traceId,
    });
  }

  if (isSchemaDriftError(err)) {
    const schemaErr = new ServiceUnavailableError(
      '数据库结构未与当前代码同步。请在服务器执行：cd server && npm run migrate，然后重启服务。',
    );
    console.error(`[${traceId}] schema drift:`, err?.message || err);
    return res.status(503).json({
      code: 503,
      message: schemaErr.message,
      data: { hint: 'schema_migration_required', sqlMessage: String(err?.message || '').slice(0, 500) },
      traceId,
    });
  }

  console.error(`[${traceId}]`, err?.stack || err);
  appendRuntimeError({ traceId, err, req });
  const rawCode = Number(err?.statusCode || err?.status || 500);
  const code = rawCode >= 400 && rawCode <= 599 ? rawCode : 500;
  const message = code >= 500 && err?.expose !== true ? '服务器内部错误' : (err?.message || '请求失败');
  return res.status(code).json({ code, message, data: null, traceId });
};

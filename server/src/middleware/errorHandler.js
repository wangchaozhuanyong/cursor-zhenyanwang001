/**
 * 统一错误处理中间件
 *
 * 处理顺序：
 * 1) Zod 校验错误 → 400 ValidationError
 * 2) Multer 文件错误 → 400
 * 3) AppError / BusinessError 子类（含历史 name === 'BusinessError'）→ 自带 statusCode
 * 4) 其他未捕获错误 → 500
 *
 * 输出格式始终为：
 *   { code, message, data, traceId }
 */
const { ZodError } = require('zod');
const { AppError } = require('../errors');

/**
 * @param {Error & { statusCode?: number; status?: number; code?: any; expose?: boolean; details?: any }} err
 * @param {import('express').Request & { traceId?: string }} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} _next
 */
module.exports = function errorHandler(err, req, res, _next) {
  const traceId = req.traceId || '';

  if (err instanceof ZodError) {
    const message = err.issues
      .map((iss) => `${iss.path.length ? iss.path.join('.') : '(root)'}: ${iss.message}`)
      .join('；');
    return res
      .status(400)
      .json({ code: 400, message: message || '参数校验失败', data: null, traceId });
  }

  if (err && err.code === 'LIMIT_FILE_SIZE') {
    return res
      .status(400)
      .json({ code: 400, message: '文件大小超出限制', data: null, traceId });
  }
  if (err && typeof err.message === 'string' && (err.message.includes('不支持的文件类型') || err.message.includes('只允许上传图片文件'))) {
    return res
      .status(400)
      .json({ code: 400, message: err.message, data: null, traceId });
  }

  if (err instanceof AppError || (err && err.name === 'BusinessError')) {
    const statusCode = Number(err.statusCode || err.code || 400);
    const message = err.message || '请求失败';
    return res.status(statusCode).json({
      code: statusCode,
      message,
      data: err.details ?? null,
      traceId,
    });
  }

  console.error(`[${traceId}]`, err && err.stack ? err.stack : err);
  const code = Number(err?.statusCode || err?.status || 500);
  const message = err?.message || '服务器内部错误';
  return res.status(code).json({ code, message, data: null, traceId });
};

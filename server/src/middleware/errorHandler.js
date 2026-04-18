module.exports = function errorHandler(err, req, res, _next) {
  console.error(`[${req.traceId}]`, err.stack || err);
  const code = err.statusCode || err.status || 500;
  const message = err.message || '服务器内部错误';
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ code: 400, message: '文件大小超出限制', data: null, traceId: req.traceId || '' });
  }
  if (err.message && err.message.includes('不支持的文件类型')) {
    return res.status(400).json({ code: 400, message, data: null, traceId: req.traceId || '' });
  }
  res.status(code).json({ code, message, data: null, traceId: req.traceId || '' });
};

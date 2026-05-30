module.exports = function apiNotFound(req, res, next) {
  if (res.headersSent) return next();
  return res.status(404).json({
    code: 404,
    message: '接口不存在',
    data: null,
    traceId: req.traceId || '',
  });
};

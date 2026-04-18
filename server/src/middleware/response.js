const crypto = require('crypto');

module.exports = function responseMiddleware(req, res, next) {
  const traceId = crypto.randomUUID();
  req.traceId = traceId;

  res.success = (data = null, message = 'success') => {
    res.json({ code: 0, message, data, traceId });
  };

  res.fail = (code, message, data = null) => {
    const httpStatus = code >= 100 && code < 600 ? code : 400;
    res.status(httpStatus).json({ code, message, data, traceId });
  };

  res.paginate = (list, total, page, pageSize) => {
    const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
    res.json({
      code: 0,
      message: 'success',
      data: { list, total, page, pageSize, totalPages },
      traceId,
    });
  };

  next();
};

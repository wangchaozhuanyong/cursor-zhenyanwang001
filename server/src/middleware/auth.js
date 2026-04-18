const { verifyToken } = require('../utils/helpers');

module.exports = function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.fail(401, '请先登录');
  }
  try {
    const payload = verifyToken(header.split(' ')[1]);
    req.user = { id: payload.userId };
    next();
  } catch {
    return res.fail(401, '登录已过期，请重新登录');
  }
};

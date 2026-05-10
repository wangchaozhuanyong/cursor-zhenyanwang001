const { verifyToken } = require('../utils/helpers');
const authRepo = require('../modules/auth/auth.repository');

module.exports = async function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.fail(401, '请先登录');
  }
  try {
    const payload = /** @type {{ type?: string, userId?: string }} */ (verifyToken(header.split(' ')[1]));
    if (payload.type === 'refresh') {
      return res.fail(401, '登录已过期，请重新登录');
    }
    const user = await authRepo.selectIdAndRoleByUserId(payload.userId);
    if (!user || user.role === 'disabled') {
      return res.fail(401, '账号不存在或已注销');
    }
    req.user = { id: payload.userId };
    next();
  } catch {
    return res.fail(401, '登录已过期，请重新登录');
  }
};

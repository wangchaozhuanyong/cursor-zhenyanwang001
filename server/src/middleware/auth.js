const { verifyToken } = require('../utils/helpers');
const authRepo = require('../modules/auth/repository/auth.repository');
const { getAccessTokenFromRequest } = require('../utils/authCookies');

module.exports = async function authMiddleware(req, res, next) {
  const token = getAccessTokenFromRequest(req);
  if (!token) {
    return res.fail(401, '请先登录');
  }
  try {
    const payload = /** @type {{ type?: string, userId?: string }} */ (verifyToken(token));
    if (payload.type === 'refresh') {
      return res.fail(401, '登录已过期，请重新登录');
    }
    const user = await authRepo.selectIdAndRoleByUserId(payload.userId);
    if (!user || user.role === 'disabled') {
      return res.fail(401, '账号不存在或已注销');
    }
    if (user.account_status === 'disabled' || user.account_status === 'blacklisted') {
      return res.fail(403, '账号已被限制使用');
    }
    req.user = { id: payload.userId };
    next();
  } catch {
    return res.fail(401, '登录已过期，请重新登录');
  }
};

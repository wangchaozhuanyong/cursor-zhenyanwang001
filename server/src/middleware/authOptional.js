const { verifyToken } = require('../utils/helpers');
const authRepo = require('../modules/auth/repository/auth.repository');
const { getAccessTokenFromRequest } = require('../utils/authCookies');

module.exports = async function authOptional(req, _res, next) {
  const token = getAccessTokenFromRequest(req);
  if (!token) return next();
  try {
    const payload = /** @type {{ type?: string, userId?: string }} */ (verifyToken(token));
    if (payload.type === 'refresh' || !payload.userId) return next();
    const user = await authRepo.selectIdAndRoleByUserId(payload.userId);
    if (!user || user.role === 'disabled') return next();
    req.user = { id: payload.userId };
  } catch {
    // ignore invalid token for optional auth
  }
  return next();
};


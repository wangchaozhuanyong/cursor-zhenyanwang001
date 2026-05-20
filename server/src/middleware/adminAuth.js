const { verifyToken } = require('../utils/helpers');
const authRepo = require('../modules/auth/repository/auth.repository');
const rbacService = require('../modules/admin/service/rbac.service');
const { getAccessTokenFromRequest } = require('../utils/authCookies');

async function adminAuthMiddleware(req, res, next) {
  const token = getAccessTokenFromRequest(req, 'admin');
  if (!token) {
    return res.fail(401, 'Please login first');
  }

  let payload;
  try {
    payload = /** @type {{ type?: string, userId?: string }} */ (verifyToken(token));
    if (payload.type === 'refresh') {
      return res.fail(401, 'Login expired, please sign in again');
    }
  } catch {
    return res.fail(401, 'Login expired, please sign in again');
  }

  try {
    const user = await authRepo.selectIdAndRoleByUserId(payload.userId);
    if (!user) return res.fail(401, 'User not found');
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.fail(403, 'Admin permission required');
    }

    const ctx = await rbacService.getAccessContext(user.id, user.role);
    req.user = {
      id: user.id,
      role: user.role,
      permissions: ctx.permissions,
      isSuperAdmin: ctx.isSuperAdmin,
      roleCodes: ctx.roleCodes,
    };
    next();
  } catch (err) {
    next(err);
  }
}

function requirePermission(code) {
  return (req, res, next) => {
    if (!req.user) return res.fail(401, 'Please login first');
    if (req.user.isSuperAdmin) return next();
    if (req.user.permissions && req.user.permissions.includes(code)) return next();
    return res.fail(403, 'Permission denied');
  };
}

function requireAnyPermission(codes) {
  const list = Array.isArray(codes) ? codes : [];
  return (req, res, next) => {
    if (!req.user) return res.fail(401, 'Please login first');
    if (req.user.isSuperAdmin) return next();
    const ok = list.some((c) => req.user.permissions && req.user.permissions.includes(c));
    if (ok) return next();
    return res.fail(403, 'Permission denied');
  };
}

adminAuthMiddleware.requirePermission = requirePermission;
adminAuthMiddleware.requireAnyPermission = requireAnyPermission;

module.exports = adminAuthMiddleware;


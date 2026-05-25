const { verifyToken } = require('../utils/helpers');
const authRepo = require('../modules/auth/repository/auth.repository');
const rbacService = require('../modules/admin/service/rbac.service');
const adminMfaService = require('../modules/admin/service/adminMfa.service');
const { getAccessTokenFromRequest } = require('../utils/authCookies');

async function adminAuthMiddleware(req, res, next) {
  const token = getAccessTokenFromRequest(req, 'admin');
  if (!token) {
    return res.fail(401, '请先登录');
  }

  let payload;
  try {
    payload = /** @type {{ type?: string, userId?: string, adminSessionId?: string, mfaVerifiedAt?: number, mfaMethod?: string }} */ (verifyToken(token));
    if (payload.type === 'refresh') {
      return res.fail(401, '登录已过期，请重新登录');
    }
  } catch {
    return res.fail(401, '登录已过期，请重新登录');
  }

  try {
    const user = await authRepo.selectIdAndRoleByUserId(payload.userId);
    if (!user) return res.fail(401, '用户不存在');
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.fail(403, '需要管理员权限');
    }
    if (user.account_status === 'disabled' || user.account_status === 'blacklisted') {
      return res.fail(403, '管理员账号已禁用');
    }

    const ctx = await rbacService.getAccessContext(user.id, user.role);
    req.user = {
      id: user.id,
      role: user.role,
      permissions: ctx.permissions,
      isSuperAdmin: ctx.isSuperAdmin,
      roleCodes: ctx.roleCodes,
      adminSessionId: payload.adminSessionId || '',
      mfaVerifiedAt: payload.mfaVerifiedAt || 0,
      mfaMethod: payload.mfaMethod || '',
    };
    next();
  } catch (err) {
    next(err);
  }
}

function requirePermission(code) {
  return (req, res, next) => {
    if (!req.user) return res.fail(401, '请先登录');
    if (req.user.isSuperAdmin) return next();
    if (req.user.permissions && req.user.permissions.includes(code)) return next();
    return res.fail(403, '没有操作权限');
  };
}

function requireAnyPermission(codes) {
  const list = Array.isArray(codes) ? codes : [];
  return (req, res, next) => {
    if (!req.user) return res.fail(401, '请先登录');
    if (req.user.isSuperAdmin) return next();
    const ok = list.some((c) => req.user.permissions && req.user.permissions.includes(c));
    if (ok) return next();
    return res.fail(403, '没有操作权限');
  };
}

adminAuthMiddleware.requirePermission = requirePermission;
adminAuthMiddleware.requireAnyPermission = requireAnyPermission;
adminAuthMiddleware.requireRecentMfa = adminMfaService.requireRecentMfa;
adminAuthMiddleware.requireSensitiveAction = adminMfaService.requireSensitiveAction;

module.exports = adminAuthMiddleware;

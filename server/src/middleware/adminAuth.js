const { verifyToken } = require('../utils/helpers');
const authRepo = require('../modules/auth/auth.repository');
const rbacService = require('../modules/admin/rbac.service');

async function adminAuthMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.fail(401, '请先登录');
  }
  let payload;
  try {
    payload = verifyToken(header.split(' ')[1]);
  } catch {
    return res.fail(401, '登录已过期，请重新登录');
  }

  try {
    const user = await authRepo.selectIdAndRoleByUserId(payload.userId);
    if (!user) return res.fail(401, '用户不存在');
    if (user.role !== 'admin' && user.role !== 'super_admin') {
      return res.fail(403, '无管理员权限');
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
    if (!req.user) return res.fail(401, '请先登录');
    if (req.user.isSuperAdmin) return next();
    if (req.user.permissions && req.user.permissions.includes(code)) return next();
    return res.fail(403, '无权限执行此操作');
  };
}

function requireAnyPermission(codes) {
  const list = Array.isArray(codes) ? codes : [];
  return (req, res, next) => {
    if (!req.user) return res.fail(401, '请先登录');
    if (req.user.isSuperAdmin) return next();
    const ok = list.some((c) => req.user.permissions && req.user.permissions.includes(c));
    if (ok) return next();
    return res.fail(403, '无权限执行此操作');
  };
}

adminAuthMiddleware.requirePermission = requirePermission;
adminAuthMiddleware.requireAnyPermission = requireAnyPermission;
module.exports = adminAuthMiddleware;

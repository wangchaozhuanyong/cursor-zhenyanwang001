/**
 * IDOR 防护：普通用户只能访问自己的 userId
 * - 若 req.user.role 是 admin/super_admin，则放行（用于 adminAuth 场景）
 * - 否则要求 req.user.id === req.params[paramName]
 */
function ensureSelfOrAdmin(paramName = 'userId') {
  return (req, res, next) => {
    if (!req.user?.id) return res.fail(401, '请先登录');
    const role = req.user.role;
    if (role === 'admin' || role === 'super_admin') return next();
    const target = req.params?.[paramName];
    if (!target) return res.fail(400, '缺少用户标识');
    if (String(target) !== String(req.user.id)) return res.fail(403, '无权访问该资源');
    next();
  };
}

module.exports = { ensureSelfOrAdmin };


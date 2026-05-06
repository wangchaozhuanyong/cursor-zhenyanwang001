/**
 * Admin Auth/Account Controller
 *
 * 仅做：解析请求 → 调 service → 写响应。
 * 不做：业务规则、SQL、参数校验之外的逻辑。
 */
const { asyncRoute } = require('../../../middleware/asyncRoute');
const adminAuthService = require('../adminAuth.service');
const adminAccountService = require('../adminAccount.service');

exports.login = asyncRoute(async (req, res) => {
  const r = await adminAuthService.login(req.body, req);
  res.success(r.data, r.message);
});

exports.logout = asyncRoute(async (req, res) => {
  const r = await adminAuthService.logout(req.user?.id, req);
  res.success(r.data, r.message);
});

exports.getProfile = asyncRoute(async (req, res) => {
  const r = await adminAccountService.getProfile(req.user.id);
  res.success({
    ...r.data,
    permissions: req.user.permissions,
    isSuperAdmin: req.user.isSuperAdmin,
    roleCodes: req.user.roleCodes,
  });
});

exports.updateProfile = asyncRoute(async (req, res) => {
  const r = await adminAccountService.updateProfile(req.user.id, req.body);
  res.success(r.data, r.message);
});

exports.changePassword = asyncRoute(async (req, res) => {
  const r = await adminAccountService.changePassword(req.user.id, req.body);
  res.success(r.data, r.message);
});

exports.getRbacMe = asyncRoute(async (req, res) => {
  res.success({
    permissions: req.user.permissions,
    isSuperAdmin: req.user.isSuperAdmin,
    roleCodes: req.user.roleCodes,
  });
});

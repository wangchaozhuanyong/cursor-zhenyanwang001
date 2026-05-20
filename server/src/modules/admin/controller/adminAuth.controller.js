/**
 * Admin Auth/Account Controller
 *
 * 浠呭仛锛氳В鏋愯姹?鈫?璋?service 鈫?鍐欏搷搴斻€?
 * 涓嶅仛锛氫笟鍔¤鍒欍€丼QL銆佸弬鏁版牎楠屼箣澶栫殑閫昏緫銆?
 */
const { asyncRoute } = require('../../../middleware/asyncRoute');
const adminAuthService = require('../service/adminAuth.service');
const adminAccountService = require('../service/adminAccount.service');
const { setAuthCookies, clearAuthCookies, getRefreshTokenFromRequest } = require('../../../utils/authCookies');

exports.login = asyncRoute(async (req, res) => {
  const r = await adminAuthService.login(req.body, req);
  setAuthCookies(req, res, r.data.token, 'admin');
  res.success(r.data, r.message);
});

exports.refresh = asyncRoute(async (req, res) => {
  const refreshToken = getRefreshTokenFromRequest(req, 'admin');
  const r = await adminAuthService.refresh(refreshToken);
  if (r.data?.accessToken) {
    setAuthCookies(req, res, {
      accessToken: r.data.accessToken,
      refreshToken,
    }, 'admin');
  }
  res.success(r.data);
});

exports.logout = asyncRoute(async (req, res) => {
  const r = await adminAuthService.logout(req.user?.id, req);
  clearAuthCookies(req, res, 'admin');
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


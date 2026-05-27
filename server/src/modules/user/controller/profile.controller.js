const profileService = require('../service/profile.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');
const clientSecurity = require('../../security/service/clientSecurity.service');
const { getRefreshTokenFromRequest } = require('../../../utils/authCookies');

exports.getProfile = asyncRoute(async (req, res) => {
  const result = await profileService.getProfile(req.user.id);
  res.success(result.data);
});

exports.updateProfile = asyncRoute(async (req, res) => {
  const result = await profileService.updateProfile(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.changePassword = asyncRoute(async (req, res) => {
  const currentSessionId = await clientSecurity.getSessionIdForRefreshToken(getRefreshTokenFromRequest(req), req.user.id);
  const result = await profileService.changePassword(req.user.id, {
    ...req.body,
    currentSessionId,
    securityContext: clientSecurity.buildContext(req, req.body),
  });
  res.success(result.data, result.message);
});

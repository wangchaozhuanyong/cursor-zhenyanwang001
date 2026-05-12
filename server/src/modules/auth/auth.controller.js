const authService = require('./auth.service');
const authApiService = require('./services/auth.api.service');
const oauthService = require('./services/oauth.service');
const otpService = require('./services/otp.service');
const { asyncRoute } = require('../../middleware/asyncRoute');
const { ValidationError } = require('../../errors');
const {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
} = require('../../utils/authCookies');

exports.register = asyncRoute(async (req, res) => {
  const result = await authApiService.register(req.body);
  setAuthCookies(req, res, result.data.token);
  res.success(result.data, result.message);
});

exports.login = asyncRoute(async (req, res) => {
  const result = await authApiService.login(req.body);
  setAuthCookies(req, res, result.data.token);
  res.success(result.data, result.message);
});

exports.features = asyncRoute(async (req, res) => {
  res.success({
    smsOtpLoginEnabled: otpService.isOtpLoginAvailable(),
  });
});

exports.getProfile = asyncRoute(async (req, res) => {
  const result = await authService.getProfile(req.user.id);
  res.success(result.data);
});

exports.updateProfile = asyncRoute(async (req, res) => {
  const result = await authService.updateProfile(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.changePassword = asyncRoute(async (req, res) => {
  const result = await authService.changePassword(req.user.id, req.body);
  res.success(result.data, result.message);
});

exports.requestPasswordReset = asyncRoute(async (req, res) => {
  const result = await authService.requestPasswordReset(req.body);
  res.success(result.data, result.message);
});

exports.resetPassword = asyncRoute(async (req, res) => {
  const result = await authService.resetPassword(req.body);
  res.success(result.data, result.message);
});

exports.refresh = asyncRoute(async (req, res) => {
  const refreshToken = req.body.refreshToken || getRefreshTokenFromRequest(req);
  const result = await authService.refresh(refreshToken);
  if (result.data?.accessToken) {
    setAuthCookies(req, res, {
      accessToken: result.data.accessToken,
      refreshToken,
    });
  }
  res.success(result.data);
});

exports.logout = asyncRoute(async (req, res) => {
  const result = await authService.logout(req.user?.id);
  clearAuthCookies(req, res);
  res.success(result.data, result.message);
});

exports.oauthStart = asyncRoute(async (req, res, next) => {
  try {
    const url = await oauthService.startOAuth(req.params.provider, req.query.redirect);
    res.redirect(302, url);
  } catch (e) {
    if (e instanceof ValidationError) {
      return res.redirect(302, oauthService.redirectLoginWithOAuthError(e.message));
    }
    next(e);
  }
});

exports.oauthCallback = asyncRoute(async (req, res) => {
  const url = await oauthService.handleOAuthCallback(req.params.provider, req.query);
  res.redirect(302, url);
});

exports.oauthExchange = asyncRoute(async (req, res) => {
  const result = await oauthService.exchangeTicket(req.body);
  setAuthCookies(req, res, result.data.token);
  res.success(result.data, result.message);
});

exports.otpSend = asyncRoute(async (req, res) => {
  const result = await otpService.sendOtp(req.body, {
    ip: req.ip,
    userAgent: req.get('user-agent'),
  });
  res.success(result.data, result.message);
});

exports.otpLogin = asyncRoute(async (req, res) => {
  const result = await otpService.loginWithOtp(req.body);
  setAuthCookies(req, res, result.data.token);
  res.success(result.data, result.message);
});

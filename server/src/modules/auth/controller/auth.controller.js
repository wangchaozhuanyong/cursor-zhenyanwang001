const authService = require('../service/auth.service');
const authApiService = require('../service/auth.api.service');
const oauthService = require('../service/oauth.service');
const wechatService = require('../service/wechat.service');
const otpService = require('../service/otp.service');
const { asyncRoute } = require('../../../middleware/asyncRoute');
const { ValidationError } = require('../../../errors');
const {
  setAuthCookies,
  clearAuthCookies,
  getRefreshTokenFromRequest,
  getAccessTokenFromRequest,
} = require('../../../utils/authCookies');
const { getClientIp } = require('../../../utils/clientIp');

exports.register = asyncRoute(async (req, res) => {
  const result = await authApiService.register(req.body);
  setAuthCookies(req, res, result.data.token);
  res.success(result.data, result.message);
});

exports.login = asyncRoute(async (req, res) => {
  const result = await authApiService.login(req.body, req);
  setAuthCookies(req, res, result.data.token);
  res.success(result.data, result.message);
});

exports.features = asyncRoute(async (req, res) => {
  res.success({
    smsOtpLoginEnabled: await otpService.isOtpLoginAvailable(),
    wechatLoginEnabled: wechatService.isWechatLoginEnabled(),
  });
});

exports.session = asyncRoute(async (req, res) => {
  const result = await authService.sessionStatus({
    accessToken: getAccessTokenFromRequest(req),
    refreshToken: getRefreshTokenFromRequest(req),
  });
  res.success(result.data);
});

exports.refreshSession = asyncRoute(async (req, res) => {
  const result = await authService.sessionStatus({
    refreshToken: getRefreshTokenFromRequest(req),
  });
  res.success(result.data);
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
  const refreshToken = req.body?.refreshToken || getRefreshTokenFromRequest(req);
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

exports.wechatLoginStart = asyncRoute(async (req, res, next) => {
  try {
    const url = await wechatService.startWechatLogin(req.query.redirect);
    res.redirect(302, url);
  } catch (e) {
    if (e instanceof ValidationError) {
      const errRedirect = wechatService.redirectLoginWithWechatError(e.message);
      return res.redirect(302, errRedirect.redirectUrl);
    }
    next(e);
  }
});

exports.wechatCallback = asyncRoute(async (req, res) => {
  const result = await wechatService.handleWechatCallback(req.query);
  if (result.authToken) {
    setAuthCookies(req, res, result.authToken);
  }
  res.redirect(302, result.redirectUrl);
});

exports.wechatBindPhone = asyncRoute(async (req, res) => {
  const result = await wechatService.bindPhone(req.body, {
    ip: getClientIp(req),
    userAgent: req.get('user-agent'),
  });
  setAuthCookies(req, res, result.data.token);
  res.success(result.data, result.message);
});

exports.wechatOtpSend = asyncRoute(async (req, res) => {
  const result = await otpService.sendOtpForWechatBind(req.body, {
    ip: getClientIp(req),
    userAgent: req.get('user-agent'),
  });
  res.success(result.data, result.message);
});

exports.oauthExchange = asyncRoute(async (req, res) => {
  const result = await oauthService.exchangeTicket(req.body);
  setAuthCookies(req, res, result.data.token);
  res.success(result.data, result.message);
});

exports.otpSend = asyncRoute(async (req, res) => {
  const result = await otpService.sendOtp(req.body, {
    ip: getClientIp(req),
    userAgent: req.get('user-agent'),
  });
  res.success(result.data, result.message);
});

exports.otpLogin = asyncRoute(async (req, res) => {
  const result = await otpService.loginWithOtp(req.body, {
    ip: getClientIp(req),
    userAgent: req.get('user-agent'),
  });
  setAuthCookies(req, res, result.data.token);
  res.success(result.data, result.message);
});

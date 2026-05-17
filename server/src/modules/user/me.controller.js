const wechatService = require('../auth/services/wechat.service');
const { asyncRoute } = require('../../middleware/asyncRoute');
const { ValidationError } = require('../../errors');

exports.bindWechat = asyncRoute(async (req, res) => {
  const url = await wechatService.startWechatBind(req.user.id, req.body?.redirect);
  res.success({ authorizeUrl: url }, '请在新窗口完成微信授权');
});

exports.unbindWechat = asyncRoute(async (req, res) => {
  const result = await wechatService.unbindWechatForUser(req.user.id);
  res.success(result.data, result.message);
});

exports.getWechatBinding = asyncRoute(async (req, res) => {
  const data = await wechatService.getWechatBindingForProfile(req.user.id);
  res.success({
    ...data,
    wechatLoginEnabled: wechatService.isWechatLoginEnabled(),
  });
});

exports.bindWechatStart = asyncRoute(async (req, res, next) => {
  try {
    const url = await wechatService.startWechatBind(req.user.id, req.query.redirect);
    res.redirect(302, url);
  } catch (e) {
    if (e instanceof ValidationError) {
      const base = String(process.env.PUBLIC_APP_URL || 'http://localhost:5173').replace(/\/$/, '');
      const u = new URL('/settings', `${base}/`);
      u.searchParams.set('wechatError', e.message);
      return res.redirect(302, u.toString());
    }
    next(e);
  }
});

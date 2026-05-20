const { Router } = require('express');
const ctrl = require('../controller/auth.controller');
const auth = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
  requestPasswordResetBodySchema,
  resetPasswordBodySchema,
  oauthProviderParamSchema,
  oauthStartQuerySchema,
  oauthExchangeBodySchema,
  wechatBindPhoneBodySchema,
  wechatOtpSendBodySchema,
  otpSendBodySchema,
  otpLoginBodySchema,
} = require('../schemas/auth.schemas');

const router = Router();

router.get(
  '/oauth/:provider/start',
  validate({ params: oauthProviderParamSchema, query: oauthStartQuerySchema }),
  ctrl.oauthStart,
);
router.get(
  '/oauth/:provider/callback',
  validate({ params: oauthProviderParamSchema }),
  ctrl.oauthCallback,
);

router.get('/wechat/login', ctrl.wechatLoginStart);
router.get('/wechat/callback', ctrl.wechatCallback);
router.post('/wechat/bind-phone', validate({ body: wechatBindPhoneBodySchema }), ctrl.wechatBindPhone);
router.post('/wechat/otp/send', validate({ body: wechatOtpSendBodySchema }), ctrl.wechatOtpSend);

router.post('/register', validate({ body: registerBodySchema }), ctrl.register);
router.post('/login', validate({ body: loginBodySchema }), ctrl.login);
router.get('/features', ctrl.features);
router.post('/password-reset/request', validate({ body: requestPasswordResetBodySchema }), ctrl.requestPasswordReset);
router.post('/password-reset/confirm', validate({ body: resetPasswordBodySchema }), ctrl.resetPassword);
router.post('/refresh', validate({ body: refreshBodySchema }), ctrl.refresh);
router.post('/logout', auth, ctrl.logout);

router.post('/oauth/exchange', validate({ body: oauthExchangeBodySchema }), ctrl.oauthExchange);
router.post('/otp/send', validate({ body: otpSendBodySchema }), ctrl.otpSend);
router.post('/otp/login', validate({ body: otpLoginBodySchema }), ctrl.otpLogin);

module.exports = router;

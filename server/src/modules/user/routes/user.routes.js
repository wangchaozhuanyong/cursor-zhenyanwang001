const { Router } = require('express');
const authCtrl = require('../../auth/controller/auth.controller');
const privacyCtrl = require('../controller/privacy.controller');
const auth = require('../../../middleware/auth');
const { userQueryLimiter } = require('../../../middleware/rateLimiters');
const { validate } = require('../../../middleware/validate');
const {
  updateProfileBodySchema,
  changePasswordBodySchema,
} = require('../../auth/schemas/auth.schemas');
const { cancelAccountBodySchema } = require('../schemas/user.schemas');

const router = Router();

router.get('/profile', auth, userQueryLimiter, authCtrl.getProfile);
router.put('/profile', auth, validate({ body: updateProfileBodySchema }), authCtrl.updateProfile);
router.put('/password', auth, validate({ body: changePasswordBodySchema }), authCtrl.changePassword);
router.get('/export', auth, userQueryLimiter, privacyCtrl.exportAccountData);
router.post('/account/cancel', auth, validate({ body: cancelAccountBodySchema }), privacyCtrl.cancelAccount);

module.exports = router;



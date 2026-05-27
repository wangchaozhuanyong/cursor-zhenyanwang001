const { Router } = require('express');
const profileCtrl = require('../controller/profile.controller');
const privacyCtrl = require('../controller/privacy.controller');
const securityCtrl = require('../controller/security.controller');
const auth = require('../../../middleware/auth');
const { userQueryLimiter } = require('../../../middleware/rateLimiters');
const { validate } = require('../../../middleware/validate');
const {
  updateProfileBodySchema,
  changePasswordBodySchema,
} = require('../../auth/schemas/auth.schemas');
const { cancelAccountBodySchema } = require('../schemas/user.schemas');

const router = Router();

router.get('/profile', auth, userQueryLimiter, profileCtrl.getProfile);
router.put('/profile', auth, validate({ body: updateProfileBodySchema }), profileCtrl.updateProfile);
router.put('/password', auth, validate({ body: changePasswordBodySchema }), profileCtrl.changePassword);
router.get('/security/sessions', auth, userQueryLimiter, securityCtrl.listSessions);
router.delete('/security/sessions/:id', auth, securityCtrl.revokeSession);
router.get('/export', auth, userQueryLimiter, privacyCtrl.exportAccountData);
router.post('/account/cancel', auth, validate({ body: cancelAccountBodySchema }), privacyCtrl.cancelAccount);

module.exports = router;


const { Router } = require('express');
const authCtrl = require('../auth/auth.controller');
const auth = require('../../middleware/auth');
const { userQueryLimiter } = require('../../middleware/rateLimiters');
const { validate } = require('../../middleware/validate');
const {
  updateProfileBodySchema,
  changePasswordBodySchema,
} = require('../auth/schemas/auth.schemas');

const router = Router();

router.get('/profile', auth, userQueryLimiter, authCtrl.getProfile);
router.put('/profile', auth, validate({ body: updateProfileBodySchema }), authCtrl.updateProfile);
router.put('/password', auth, validate({ body: changePasswordBodySchema }), authCtrl.changePassword);

module.exports = router;

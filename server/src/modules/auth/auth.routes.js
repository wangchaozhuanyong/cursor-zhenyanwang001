const { Router } = require('express');
const ctrl = require('./auth.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const {
  registerBodySchema,
  loginBodySchema,
  refreshBodySchema,
} = require('./schemas/auth.schemas');

const router = Router();

router.post('/register', validate({ body: registerBodySchema }), ctrl.register);
router.post('/login', validate({ body: loginBodySchema }), ctrl.login);
router.post('/refresh', validate({ body: refreshBodySchema }), ctrl.refresh);
router.post('/logout', auth, ctrl.logout);

module.exports = router;

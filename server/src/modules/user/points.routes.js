const { Router } = require('express');
const ctrl = require('./points.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { pointsListQuerySchema } = require('./schemas/user.schemas');

const router = Router();

router.get('/records', auth, validate({ query: pointsListQuerySchema }), ctrl.getRecords);
router.get('/balance', auth, ctrl.getBalance);
router.post('/sign-in', auth, ctrl.signIn);

module.exports = router;

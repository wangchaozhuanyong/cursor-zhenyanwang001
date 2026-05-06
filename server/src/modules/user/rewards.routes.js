const { Router } = require('express');
const ctrl = require('./reward.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { withdrawBodySchema } = require('./schemas/user.schemas');

const router = Router();

router.get('/records', auth, ctrl.getRecords);
router.get('/balance', auth, ctrl.getBalance);
router.post('/withdraw', auth, validate({ body: withdrawBodySchema }), ctrl.withdraw);

module.exports = router;

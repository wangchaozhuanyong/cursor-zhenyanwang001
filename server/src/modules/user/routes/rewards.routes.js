const { Router } = require('express');
const ctrl = require('../controller/reward.controller');
const auth = require('../../../middleware/auth');
const { validate } = require('../../../middleware/validate');
const { withdrawBodySchema } = require('../schemas/user.schemas');

const router = Router();

router.get('/records', auth, ctrl.getRecords);
router.get('/transactions', auth, ctrl.getTransactions);
router.get('/balance', auth, ctrl.getBalance);
router.get('/config', auth, ctrl.getConfig);
router.post('/withdraw', auth, validate({ body: withdrawBodySchema }), ctrl.withdraw);

module.exports = router;




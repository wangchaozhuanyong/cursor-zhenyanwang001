const { Router } = require('express');
const ctrl = require('./reward.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/records', auth, ctrl.getRecords);
router.get('/balance', auth, ctrl.getBalance);
router.post('/withdraw', auth, ctrl.withdraw);

module.exports = router;

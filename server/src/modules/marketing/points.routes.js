const { Router } = require('express');
const ctrl = require('./points.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/records', auth, ctrl.getRecords);
router.get('/balance', auth, ctrl.getBalance);
router.post('/sign-in', auth, ctrl.signIn);

module.exports = router;

const { Router } = require('express');
const ctrl = require('./invite.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/stats', auth, ctrl.getStats);
router.get('/records', auth, ctrl.getRecords);
router.post('/bind', auth, ctrl.bind);

module.exports = router;

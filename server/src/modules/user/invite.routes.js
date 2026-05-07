const { Router } = require('express');
const ctrl = require('./invite.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/stats', auth, ctrl.getStats);
router.get('/records', auth, ctrl.getRecords);

module.exports = router;

const { Router } = require('express');
const ctrl = require('../controller/invite.controller');
const auth = require('../../../middleware/auth');
const { guardByAction } = require('../../../middleware/accountStatusGuard');

const router = Router();

router.get('/stats', auth, guardByAction('invite'), ctrl.getStats);
router.get('/records', auth, guardByAction('invite'), ctrl.getRecords);

module.exports = router;





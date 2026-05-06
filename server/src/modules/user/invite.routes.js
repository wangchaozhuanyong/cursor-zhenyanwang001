const { Router } = require('express');
const ctrl = require('./invite.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { inviteBindBodySchema } = require('./schemas/user.schemas');

const router = Router();

router.get('/stats', auth, ctrl.getStats);
router.get('/records', auth, ctrl.getRecords);
router.post('/bind', auth, validate({ body: inviteBindBodySchema }), ctrl.bind);

module.exports = router;

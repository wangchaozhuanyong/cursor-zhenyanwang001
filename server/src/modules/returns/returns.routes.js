const { Router } = require('express');
const ctrl = require('./return.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/', auth, ctrl.getReturnRequests);
router.get('/:id', auth, ctrl.getReturnById);
router.post('/', auth, ctrl.createReturn);

module.exports = router;

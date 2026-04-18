const { Router } = require('express');
const ctrl = require('./history.controller');
const auth = require('../../middleware/auth');

const router = Router();

router.get('/', auth, ctrl.getHistory);
router.post('/', auth, ctrl.addHistory);
router.delete('/', auth, ctrl.clearHistory);

module.exports = router;

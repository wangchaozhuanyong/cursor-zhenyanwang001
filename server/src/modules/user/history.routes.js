const { Router } = require('express');
const ctrl = require('./history.controller');
const auth = require('../../middleware/auth');
const { validate } = require('../../middleware/validate');
const { addHistoryBodySchema } = require('./schemas/user.schemas');

const router = Router();

router.get('/', auth, ctrl.getHistory);
router.post('/', auth, validate({ body: addHistoryBodySchema }), ctrl.addHistory);
router.delete('/', auth, ctrl.clearHistory);

module.exports = router;

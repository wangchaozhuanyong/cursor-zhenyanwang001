const { Router } = require('express');
const ctrl = require('../controller/search.controller');
const { highCostApiLimiter } = require('../../../middleware/rateLimiters');

const router = Router();

router.get('/hot', ctrl.hot);
router.get('/suggest', highCostApiLimiter, ctrl.suggest);
router.post('/track', highCostApiLimiter, ctrl.track);

module.exports = router;

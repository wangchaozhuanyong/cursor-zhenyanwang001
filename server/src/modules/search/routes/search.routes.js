const { Router } = require('express');
const ctrl = require('../controller/search.controller');

const router = Router();

router.get('/hot', ctrl.hot);
router.get('/suggest', ctrl.suggest);
router.post('/track', ctrl.track);

module.exports = router;

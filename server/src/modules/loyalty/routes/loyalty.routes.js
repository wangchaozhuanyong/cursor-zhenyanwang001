const { Router } = require('express');
const ctrl = require('../controller/loyalty.controller');

const router = Router();

router.get('/config', ctrl.getConfig);

module.exports = router;


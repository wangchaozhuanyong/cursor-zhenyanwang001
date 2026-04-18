const { Router } = require('express');
const health = require('./health.controller');

const router = Router();

router.get('/live', health.liveness);
router.get('/ready', health.readiness);

module.exports = router;

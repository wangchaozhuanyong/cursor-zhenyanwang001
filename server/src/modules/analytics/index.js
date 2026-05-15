const { Router } = require('express');

const router = Router();
router.use('/analytics', require('./analytics.routes'));

module.exports = router;


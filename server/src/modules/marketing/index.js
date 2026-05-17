const { Router } = require('express');
const marketingRoutes = require('./marketing.routes');

const router = Router();
router.use('/marketing', marketingRoutes);

module.exports = router;

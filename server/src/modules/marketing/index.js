const { Router } = require('express');
const marketingRoutes = require('./routes/marketing.routes');
const publicApi = require('./publicApi');

const router = Router();
router.use('/marketing', marketingRoutes);

/** @type {any} */ (router).api = publicApi;

module.exports = router;

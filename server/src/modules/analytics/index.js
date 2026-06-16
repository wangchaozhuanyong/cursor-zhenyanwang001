const { Router } = require('express');
const publicApi = require('./publicApi');

const router = Router();
router.use('/analytics', require('./routes/analytics.routes'));

/** @type {any} */ (router).api = publicApi;

module.exports = router;

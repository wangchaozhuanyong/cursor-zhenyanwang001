const { Router } = require('express');
const routes = require('./routes/monitoring.routes');
const publicApi = require('./publicApi');

const router = Router();
router.use('/admin/monitoring', routes);

/** @type {any} */ (router).api = publicApi;

module.exports = router;

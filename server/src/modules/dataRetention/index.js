const { Router } = require('express');
const routes = require('./routes/dataRetention.routes');
const publicApi = require('./publicApi');

const router = Router();
router.use('/admin/data-retention', routes);

/** @type {any} */ (router).api = publicApi;

module.exports = router;

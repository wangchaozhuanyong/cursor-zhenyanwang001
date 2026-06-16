const { Router } = require('express');
const routes = require('./routes/home.routes');
const publicApi = require('./publicApi');

const router = Router();

/** @type {any} */ (router).api = publicApi;

router.use(routes);

module.exports = router;

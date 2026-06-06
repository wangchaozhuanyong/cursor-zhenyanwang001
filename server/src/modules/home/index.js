const { Router } = require('express');
const routes = require('./routes/home.routes');
const homeService = require('./service/home.service');

const router = Router();

/** @type {any} */ (router).api = {
  invalidateHomeBootstrapCache: homeService.invalidateHomeBootstrapCache,
};

router.use(routes);

module.exports = router;

const { Router } = require('express');
const routes = require('./home.routes');

const router = Router();
router.use(routes);

module.exports = router;

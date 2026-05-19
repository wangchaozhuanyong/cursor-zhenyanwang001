const { Router } = require('express');
const routes = require('./routes/home.routes');

const router = Router();
router.use(routes);

module.exports = router;

const { Router } = require('express');
const routes = require('./routes/monitoring.routes');

const router = Router();
router.use('/admin/monitoring', routes);

module.exports = router;

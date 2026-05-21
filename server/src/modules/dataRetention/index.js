const { Router } = require('express');
const routes = require('./routes/dataRetention.routes');

const router = Router();
router.use('/admin/data-retention', routes);

module.exports = router;

const { Router } = require('express');
const routes = require('./routes/monitoring.routes');
const dataChangeTracker = require('./service/dataChangeTracker.service');
const consistencyEngine = require('./service/consistencyEngine.service');

const router = Router();
router.use('/admin/monitoring', routes);

/** @type {any} */ (router).api = {
  trackChange: dataChangeTracker.trackChange,
  trackFromRequest: dataChangeTracker.trackFromRequest,
  rescanAnomaly: consistencyEngine.rescanAnomaly,
};

module.exports = router;

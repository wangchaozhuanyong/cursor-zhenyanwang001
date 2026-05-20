const { Router } = require('express');
const logisticsService = require('./service/logistics.service');

const router = Router();
router.use('/logistics', require('./routes/logistics.routes'));

/** @type {any} */ (router).api = {
  attachTracking: logisticsService.attachTracking,
  refreshOrderTracking: logisticsService.refreshOrderTracking,
  refreshOrderTrackingQuietly: logisticsService.refreshOrderTrackingQuietly,
  listTracks: logisticsService.listTracks,
};

module.exports = router;


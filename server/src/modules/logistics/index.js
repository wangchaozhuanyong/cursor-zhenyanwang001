const { Router } = require('express');
const logisticsService = require('./logistics.service');

const router = Router();

/** @type {any} */ (router).api = {
  attachTracking: logisticsService.attachTracking,
  refreshOrderTracking: logisticsService.refreshOrderTracking,
  refreshOrderTrackingQuietly: logisticsService.refreshOrderTrackingQuietly,
  listTracks: logisticsService.listTracks,
};

module.exports = router;


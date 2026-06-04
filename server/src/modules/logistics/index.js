const logisticsService = require('./service/logistics.service');

module.exports = {
  api: {
    attachTracking: logisticsService.attachTracking,
    refreshOrderTracking: logisticsService.refreshOrderTracking,
    refreshOrderTrackingQuietly: logisticsService.refreshOrderTrackingQuietly,
    listTracks: logisticsService.listTracks,
  },
};

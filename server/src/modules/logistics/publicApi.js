const logisticsService = require('./service/logistics.service');

module.exports = {
  attachTracking: logisticsService.attachTracking,
  refreshOrderTracking: logisticsService.refreshOrderTracking,
  refreshOrderTrackingQuietly: logisticsService.refreshOrderTrackingQuietly,
  listTracks: logisticsService.listTracks,
  listReturnTracks: logisticsService.listReturnTracks,
  refreshReturnShipmentTracking: logisticsService.refreshReturnShipmentTracking,
  refreshReturnShipmentTrackingQuietly: logisticsService.refreshReturnShipmentTrackingQuietly,
  recordOrderShipment: logisticsService.recordOrderShipment,
  recordOrderShipmentQuietly: logisticsService.recordOrderShipmentQuietly,
};

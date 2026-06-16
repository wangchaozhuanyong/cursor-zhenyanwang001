const dataChangeTracker = require('./service/dataChangeTracker.service');

module.exports = {
  trackChange: dataChangeTracker.trackChange,
  trackFromRequest: dataChangeTracker.trackFromRequest,
};

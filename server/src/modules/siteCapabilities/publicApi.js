const service = require('./service/siteCapabilities.service');

module.exports = {
  getSiteCapabilities: service.getSiteCapabilities,
  isCapabilityEnabled: service.isCapabilityEnabled,
  saveSiteCapabilities: service.saveSiteCapabilities,
};

const service = require('./service/siteCapabilities.service');

module.exports = {
  api: {
    getSiteCapabilities: service.getSiteCapabilities,
    isCapabilityEnabled: service.isCapabilityEnabled,
    saveSiteCapabilities: service.saveSiteCapabilities,
  },
};

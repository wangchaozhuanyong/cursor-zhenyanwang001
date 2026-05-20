const { asyncRoute } = require('./asyncRoute');
const capabilitiesService = require('../modules/siteCapabilities/service/siteCapabilities.service');

function requireSiteCapability(capability, message = '该站点未启用此功能') {
  return asyncRoute(async (_req, res, next) => {
    const enabled = await capabilitiesService.isCapabilityEnabled(capability);
    if (!enabled) {
      return res.fail(403, message);
    }
    return next();
  });
}

module.exports = { requireSiteCapability };

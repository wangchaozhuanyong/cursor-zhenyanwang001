const { Router } = require('express');
const service = require('./service/siteCapabilities.service');

const router = Router();
router.use('/site-capabilities', require('./routes/siteCapabilities.routes'));

/** @type {any} */ (router).api = {
  getSiteCapabilities: service.getSiteCapabilities,
  isCapabilityEnabled: service.isCapabilityEnabled,
  saveSiteCapabilities: service.saveSiteCapabilities,
};

module.exports = router;

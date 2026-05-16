const { Router } = require('express');
const analyticsService = require('./analytics.service');

const router = Router();
router.use('/analytics', require('./analytics.routes'));

/** @type {any} */ (router).api = {
  trackEvent: analyticsService.trackEvent,
};

module.exports = router;

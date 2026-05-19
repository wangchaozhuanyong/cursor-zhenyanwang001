const { Router } = require('express');
const analyticsService = require('./service/analytics.service');

const router = Router();
router.use('/analytics', require('./routes/analytics.routes'));

/** @type {any} */ (router).api = {
  trackEvent: analyticsService.trackEvent,
};

module.exports = router;

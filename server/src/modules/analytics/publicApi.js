const analyticsService = require('./service/analytics.service');

module.exports = {
  trackEvent: analyticsService.trackEvent,
};

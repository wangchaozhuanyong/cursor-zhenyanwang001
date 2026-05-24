const monitoringModule = require('../../monitoring');

function getMonitoringApi() {
  return /** @type {any} */ (monitoringModule).api || {};
}

function requireMonitoringApi(name) {
  const fn = getMonitoringApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Monitoring module API missing method: ${name}`);
  }
  return fn;
}

function trackFromRequest(req, payload) {
  return requireMonitoringApi('trackFromRequest')(req, payload);
}

module.exports = {
  trackFromRequest,
};

const monitoringApi = /** @type {any} */ (require('../../monitoring/publicApi'));

function getMonitoringApi() {
  return monitoringApi || {};
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

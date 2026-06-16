const siteCapabilitiesApi = /** @type {any} */ (require('../../siteCapabilities/publicApi'));

function getSiteCapabilitiesApi() {
  return siteCapabilitiesApi || {};
}

function requireSiteCapabilitiesApi(name) {
  const fn = getSiteCapabilitiesApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`SiteCapabilities module API missing method: ${name}`);
  }
  return fn;
}

async function getSiteCapabilities() {
  return requireSiteCapabilitiesApi('getSiteCapabilities')();
}

async function isCapabilityEnabled(key) {
  return requireSiteCapabilitiesApi('isCapabilityEnabled')(key);
}

async function saveSiteCapabilities(value) {
  return requireSiteCapabilitiesApi('saveSiteCapabilities')(value);
}

module.exports = {
  getSiteCapabilities,
  isCapabilityEnabled,
  saveSiteCapabilities,
};

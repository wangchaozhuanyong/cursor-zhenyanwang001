const repo = require('../repository/siteCapabilities.repository');
const { normalizeSiteCapabilities } = require('../../../config/siteCapabilities');

const SETTING_KEY = 'site_capabilities';

async function getSiteCapabilities() {
  const raw = await repo.selectSettingValue(SETTING_KEY);
  return normalizeSiteCapabilities(raw);
}

async function saveSiteCapabilities(value) {
  const normalized = normalizeSiteCapabilities(value);
  await repo.upsertSetting(SETTING_KEY, JSON.stringify(normalized));
  return normalized;
}

async function isCapabilityEnabled(key) {
  const capabilities = await getSiteCapabilities();
  return capabilities[key] !== false;
}

module.exports = {
  SETTING_KEY,
  getSiteCapabilities,
  isCapabilityEnabled,
  saveSiteCapabilities,
};

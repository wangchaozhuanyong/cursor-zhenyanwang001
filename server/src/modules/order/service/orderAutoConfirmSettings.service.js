const siteSettingsRepo = require('../repository/siteSettings.repository');

function parseEnabled(raw) {
  if (raw == null || raw === '') return false;
  const v = String(raw).trim().toLowerCase();
  return v === '1' || v === 'true' || v === 'yes' || v === 'on';
}

function parseDays(raw) {
  const n = parseInt(String(raw ?? ''), 10);
  if (!Number.isFinite(n) || n < 1) return 7;
  return Math.min(n, 365);
}

async function loadAutoConfirmSettings() {
  const rows = await siteSettingsRepo.selectSiteSettingsByKeys([
    'autoConfirmReceiveEnabled',
    'autoConfirmReceiveDays',
  ]);
  const map = Object.fromEntries(rows.map((r) => [r.setting_key, r.setting_value]));
  return {
    enabled: parseEnabled(map.autoConfirmReceiveEnabled),
    days: parseDays(map.autoConfirmReceiveDays),
  };
}

module.exports = {
  loadAutoConfirmSettings,
  parseEnabled,
  parseDays,
};


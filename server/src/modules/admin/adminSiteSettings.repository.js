const db = require('../../config/db');

async function selectShippingSettingsRows() {
  const [rows] = await db.query(
    "SELECT setting_key, setting_value FROM site_settings WHERE setting_key LIKE 'shipping_%'",
  );
  return rows;
}

async function selectNonShippingSettingsRows() {
  const [rows] = await db.query(
    "SELECT setting_key, setting_value FROM site_settings WHERE setting_key NOT LIKE 'shipping_%'",
  );
  return rows;
}

async function upsertSetting(key, value) {
  await db.query(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
    [key, String(value), String(value)],
  );
}

module.exports = {
  selectShippingSettingsRows,
  selectNonShippingSettingsRows,
  upsertSetting,
};

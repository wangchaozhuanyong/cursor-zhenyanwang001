const db = require('../../../config/db');

async function selectSettingValue(key) {
  const [[row]] = await db.query(
    'SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
    [key],
  );
  return row?.setting_value ?? null;
}

async function upsertSetting(key, value) {
  await db.query(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES (?, ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [key, value],
  );
}

module.exports = {
  selectSettingValue,
  upsertSetting,
};

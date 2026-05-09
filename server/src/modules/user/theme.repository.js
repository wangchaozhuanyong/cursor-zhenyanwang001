const db = require('../../config/db');

async function selectThemeConfigRaw() {
  const [rows] = await db.query(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_config' LIMIT 1",
  );
  return rows[0]?.setting_value || null;
}

async function selectThemeSkinsRaw() {
  const [rows] = await db.query(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_skins' LIMIT 1",
  );
  return rows[0]?.setting_value || null;
}

async function upsertThemeConfig(configJson) {
  await db.query(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES ('theme_config', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [configJson],
  );
}

async function upsertThemeSkins(skinsJson) {
  await db.query(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES ('theme_skins', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [skinsJson],
  );
}

module.exports = {
  selectThemeConfigRaw,
  selectThemeSkinsRaw,
  upsertThemeConfig,
  upsertThemeSkins,
};

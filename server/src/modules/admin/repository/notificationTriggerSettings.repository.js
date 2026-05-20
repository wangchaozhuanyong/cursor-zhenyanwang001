const db = require('../../../config/db');

const SETTING_KEY = 'notificationTriggerRules';

async function selectTriggerRulesRaw() {
  const [[row]] = await db.query(
    'SELECT setting_value FROM site_settings WHERE setting_key = ?',
    [SETTING_KEY],
  );
  return row?.setting_value || '';
}

async function upsertTriggerRulesRaw(rawValue) {
  await db.query(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
    [SETTING_KEY, rawValue, rawValue],
  );
}

module.exports = {
  SETTING_KEY,
  selectTriggerRulesRaw,
  upsertTriggerRulesRaw,
};




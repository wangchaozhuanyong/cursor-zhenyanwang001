const db = require('../../../config/db');

async function selectShippingSettingsRows() {
  const [rows] = await db.query(
    "SELECT setting_key, setting_value, version FROM site_settings WHERE setting_key LIKE 'shipping_%'",
  );
  return rows;
}

async function selectNonShippingSettingsRows() {
  const [rows] = await db.query(
    "SELECT setting_key, setting_value, version FROM site_settings WHERE setting_key NOT LIKE 'shipping_%'",
  );
  return rows;
}

async function upsertSetting(key, value) {
  await db.query(
    'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, version = version + 1',
    [key, String(value), String(value)],
  );
}

async function selectSettingsMaxVersion(prefixMode = 'non_shipping') {
  const condition = prefixMode === 'shipping'
    ? "setting_key LIKE 'shipping_%'"
    : "setting_key NOT LIKE 'shipping_%'";
  const [[row]] = await db.query(`SELECT COALESCE(MAX(version), 1) AS version FROM site_settings WHERE ${condition}`);
  return Number(row?.version || 1);
}

async function selectSettingValue(key) {
  const [[row]] = await db.query(
    'SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
    [key],
  );
  return row?.setting_value ?? null;
}

module.exports = {
  selectShippingSettingsRows,
  selectNonShippingSettingsRows,
  upsertSetting,
  selectSettingsMaxVersion,
  selectSettingValue,
};




/**
 * 站点设置表读取（订单定时任务等跨域读取，SQL 集中于此）。
 */
const db = require('../../config/db');

/**
 * @param {string[]} keys
 * @returns {Promise<Array<{ setting_key: string, setting_value: string }>>}
 */
async function selectSiteSettingsByKeys(keys) {
  if (!keys.length) return [];
  const placeholders = keys.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT setting_key, setting_value FROM site_settings
     WHERE setting_key IN (${placeholders})`,
    keys,
  );
  return rows;
}

module.exports = {
  selectSiteSettingsByKeys,
};

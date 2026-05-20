/**
 * 绔欑偣璁剧疆琛ㄨ鍙栵紙璁㈠崟瀹氭椂浠诲姟绛夎法鍩熻鍙栵紝SQL 闆嗕腑浜庢锛夈€? */
const db = require('../../../config/db');

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

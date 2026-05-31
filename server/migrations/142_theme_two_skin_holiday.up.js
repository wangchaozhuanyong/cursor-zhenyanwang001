const { normalizeThemeSkinsPayload, normalizeThemeConfig } = require('../src/modules/user/service/theme.service');

module.exports = {
  async up(query) {
    const [rows] = await query(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_skins' LIMIT 1",
    );

    let payload = null;
    if (rows?.[0]?.setting_value) {
      try {
        payload = JSON.parse(rows[0].setting_value);
      } catch {
        payload = null;
      }
    }

    const next = normalizeThemeSkinsPayload(payload);
    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(next)],
    );

    const runtime = next.skins.find((skin) => skin.id === next.runtimeSkinId)
      || next.skins.find((skin) => skin.id === next.activeSkinId)
      || next.skins[0];
    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_config', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(normalizeThemeConfig(runtime?.config))],
    );
  },
};

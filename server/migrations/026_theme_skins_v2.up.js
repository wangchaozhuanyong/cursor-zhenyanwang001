const { DEFAULT_SKIN_ID, THEME_PRESETS } = require('../src/modules/user/theme.presets');

module.exports = {
  async up(query) {
    const skinPayload = {
      defaultSkinId: DEFAULT_SKIN_ID,
      activeSkinId: DEFAULT_SKIN_ID,
      skins: THEME_PRESETS,
    };

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(skinPayload)],
    );
  },
};

const { DEFAULT_THEME_CONFIG } = require('../src/modules/theme/theme.default');

module.exports = {
  async up(query) {
    // Store multiple theme skins in one site_settings row.
    // - theme_skins.defaultSkinId: which skin is applied for new/anonymous users
    // - theme_skins.skins: array of { id, name, config }
    const skinPayload = {
      defaultSkinId: 'default',
      skins: [
        {
          id: 'default',
          name: '默认皮肤',
          config: DEFAULT_THEME_CONFIG,
        },
      ],
    };

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(skinPayload)],
    );
  },
};


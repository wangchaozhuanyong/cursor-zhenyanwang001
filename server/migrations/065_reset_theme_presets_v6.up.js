const { DEFAULT_SKIN_ID, THEME_PRESETS } = require('../src/modules/user/theme.presets');
const { normalizeThemeConfig, normalizeThemeSkinsPayload } = require('../src/modules/user/theme.service');

/**
 * 将 theme_skins 重置为 6 套大马通 V6 系统预设；
 * 默认与当前生效皮肤均为「大马通默认生活服务绿」。
 */
module.exports = {
  async up(query) {
    const payload = normalizeThemeSkinsPayload({
      defaultSkinId: DEFAULT_SKIN_ID,
      activeSkinId: DEFAULT_SKIN_ID,
      skins: THEME_PRESETS.map((skin) => ({
        id: skin.id,
        name: skin.name,
        clientEnabled: true,
        config: normalizeThemeConfig(skin.config),
      })),
    });

    const activeSkin =
      payload.skins.find((skin) => skin.id === payload.activeSkinId) || payload.skins[0];
    const activeConfig = normalizeThemeConfig(activeSkin?.config);

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(payload)],
    );

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_config', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(activeConfig)],
    );
  },
};

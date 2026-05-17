const { normalizeThemeConfig, normalizeThemeSkinsPayload } = require('../src/modules/user/theme.service');
const { VIBRANT_SUNSET_CORAL_SKIN, VIBRANT_SUNSET_CORAL_SKIN_ID } = require('../src/modules/user/starterThemeSkins');

/**
 * 将推荐皮肤「活力满分·日落珊瑚」合并进 theme_skins（已存在则跳过）。
 * 不修改 defaultSkinId / activeSkinId。
 */
module.exports = {
  async up(query) {
    const [rows] = await query(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_skins' LIMIT 1",
    );
    let payload;
    if (rows?.[0]?.setting_value) {
      try {
        payload = normalizeThemeSkinsPayload(JSON.parse(rows[0].setting_value));
      } catch {
        payload = normalizeThemeSkinsPayload(null);
      }
    } else {
      payload = normalizeThemeSkinsPayload(null);
    }

    if (payload.skins.some((s) => s.id === VIBRANT_SUNSET_CORAL_SKIN_ID)) {
      return;
    }

    const next = normalizeThemeSkinsPayload({
      defaultSkinId: payload.defaultSkinId,
      activeSkinId: payload.activeSkinId,
      skins: [
        ...payload.skins,
        {
          ...VIBRANT_SUNSET_CORAL_SKIN,
          config: normalizeThemeConfig(VIBRANT_SUNSET_CORAL_SKIN.config),
        },
      ],
    });

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(next)],
    );
  },
};

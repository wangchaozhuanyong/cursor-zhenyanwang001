const { normalizeThemeConfig, normalizeThemeSkinsPayload } = require('../src/modules/user/theme.service');
const { GALLERY_MINIMAL_SKIN, GALLERY_MINIMAL_SKIN_ID } = require('../src/modules/user/starterThemeSkins');

/**
 * 将推荐皮肤「极简美学·画廊叙事」合并进 theme_skins（已存在则跳过）。
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

    if (payload.skins.some((s) => s.id === GALLERY_MINIMAL_SKIN_ID)) {
      return;
    }

    const next = normalizeThemeSkinsPayload({
      defaultSkinId: payload.defaultSkinId,
      activeSkinId: payload.activeSkinId,
      skins: [
        ...payload.skins,
        {
          ...GALLERY_MINIMAL_SKIN,
          config: normalizeThemeConfig(GALLERY_MINIMAL_SKIN.config),
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

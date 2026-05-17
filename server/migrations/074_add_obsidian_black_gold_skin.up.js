const { normalizeThemeConfig, normalizeThemeSkinsPayload } = require('../src/modules/user/theme.service');
const { OBSIDIAN_BLACK_GOLD_SKIN, OBSIDIAN_BLACK_GOLD_SKIN_ID } = require('../src/modules/user/starterThemeSkins');

/**
 * 将推荐皮肤「曜石黑金·尊享大马通」合并进 theme_skins（已存在则跳过）。
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

    if (payload.skins.some((s) => s.id === OBSIDIAN_BLACK_GOLD_SKIN_ID)) {
      return;
    }

    const next = normalizeThemeSkinsPayload({
      defaultSkinId: payload.defaultSkinId,
      activeSkinId: payload.activeSkinId,
      skins: [
        ...payload.skins,
        {
          ...OBSIDIAN_BLACK_GOLD_SKIN,
          config: normalizeThemeConfig(OBSIDIAN_BLACK_GOLD_SKIN.config),
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

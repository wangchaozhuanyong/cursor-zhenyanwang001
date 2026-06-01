const { DEFAULT_SKIN_ID, DAILY_COMMERCE_SKIN } = require('../src/modules/theme/theme.presets');
const {
  normalizeThemeConfig,
  normalizeThemeSkinsPayload,
  resolveRuntimeThemeSkinId,
} = require('../src/modules/theme/service/theme.service');

module.exports = {
  async up(query) {
    const [rows] = await query(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_skins' LIMIT 1",
    );

    let current = {};
    if (rows?.[0]?.setting_value) {
      try {
        current = JSON.parse(rows[0].setting_value);
      } catch {
        current = {};
      }
    }

    const normalized = normalizeThemeSkinsPayload(current);
    const nextSkins = normalized.skins.map((skin) => {
      if (skin.id !== DEFAULT_SKIN_ID) return skin;
      return {
        ...skin,
        name: DAILY_COMMERCE_SKIN.name,
        description: DAILY_COMMERCE_SKIN.description,
        sceneTag: DAILY_COMMERCE_SKIN.sceneTag,
        clientEnabled: true,
        config: normalizeThemeConfig(DAILY_COMMERCE_SKIN.config),
      };
    });
    const next = normalizeThemeSkinsPayload({ ...normalized, skins: nextSkins });
    const runtimeId = next.runtimeSkinId || resolveRuntimeThemeSkinId(next);
    const active = next.skins.find((skin) => skin.id === runtimeId)
      || next.skins.find((skin) => skin.id === next.activeSkinId)
      || next.skins[0];

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(next)],
    );
    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_config', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(normalizeThemeConfig(active?.config))],
    );
  },
};

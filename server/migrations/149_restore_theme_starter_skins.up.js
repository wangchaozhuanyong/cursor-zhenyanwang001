const {
  normalizeThemeSkinsPayload,
  normalizeThemeConfig,
} = require('../src/modules/theme/service/theme.service');
const {
  THEME_PRESETS,
} = require('../src/modules/theme/theme.presets');

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
    const byId = new Map(normalized.skins.map((skin) => [skin.id, skin]));
    const skins = normalized.skins.slice();
    let touched = false;

    THEME_PRESETS.forEach((preset) => {
      if (byId.has(preset.id)) return;
      skins.push({
        ...preset,
        config: normalizeThemeConfig(preset.config),
      });
      touched = true;
    });

    const next = normalizeThemeSkinsPayload({
      defaultSkinId: normalized.defaultSkinId,
      activeSkinId: normalized.activeSkinId,
      holidaySkinId: normalized.holidaySkinId,
      holidayRules: normalized.holidayRules,
      skins,
    });

    if (!touched && JSON.stringify(next) === JSON.stringify(normalized)) return;

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(next)],
    );

    const runtime = next.skins.find((skin) => skin.id === next.runtimeSkinId)
      || next.skins.find((skin) => skin.id === next.activeSkinId)
      || next.skins[0];
    if (runtime?.config) {
      await query(
        `INSERT INTO site_settings (setting_key, setting_value)
         VALUES ('theme_config', ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [JSON.stringify(normalizeThemeConfig(runtime.config))],
      );
    }
  },
};

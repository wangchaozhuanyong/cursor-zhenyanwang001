const {
  DEFAULT_HOLIDAY_SKIN_ID,
  DEFAULT_SKIN_ID,
} = require('../src/modules/theme/theme.presets');
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
    const hasSkin = (id) => !!id && normalized.skins.some((skin) => skin.id === id);
    const activeSkinId = hasSkin(normalized.activeSkinId) ? normalized.activeSkinId : DEFAULT_SKIN_ID;
    const next = normalizeThemeSkinsPayload({
      ...normalized,
      defaultSkinId: DEFAULT_SKIN_ID,
      activeSkinId,
      holidaySkinId: DEFAULT_HOLIDAY_SKIN_ID,
      holidayRules: normalized.holidayRules.map((rule) => ({
        ...rule,
        skinId: hasSkin(rule.skinId) ? rule.skinId : DEFAULT_HOLIDAY_SKIN_ID,
      })),
    });

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(next)],
    );

    const runtimeId = next.runtimeSkinId || resolveRuntimeThemeSkinId(next);
    const active = next.skins.find((skin) => skin.id === runtimeId)
      || next.skins.find((skin) => skin.id === next.activeSkinId)
      || next.skins[0];

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_config', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(normalizeThemeConfig(active?.config))],
    );
  },
};

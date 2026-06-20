const {
  DEFAULT_THEME_HOLIDAY_RULES,
  PREMIUM_CHAMPAGNE_IVORY_SKIN,
  PREMIUM_CHAMPAGNE_IVORY_SKIN_ID,
} = require('../src/modules/theme/theme.presets');
const { normalizeThemeConfig, normalizeThemeSkinsPayload } = require('../src/modules/theme/service/theme.service');

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
    const sourceRules = normalized.holidayRules?.length
      ? normalized.holidayRules
      : DEFAULT_THEME_HOLIDAY_RULES;
    const holidayRules = sourceRules.map((rule) => ({
      ...rule,
      skinId: PREMIUM_CHAMPAGNE_IVORY_SKIN_ID,
    }));
    const config = normalizeThemeConfig(PREMIUM_CHAMPAGNE_IVORY_SKIN.config);
    const onlySkin = {
      ...PREMIUM_CHAMPAGNE_IVORY_SKIN,
      config,
    };
    const next = {
      defaultSkinId: PREMIUM_CHAMPAGNE_IVORY_SKIN_ID,
      activeSkinId: PREMIUM_CHAMPAGNE_IVORY_SKIN_ID,
      runtimeSkinId: PREMIUM_CHAMPAGNE_IVORY_SKIN_ID,
      holidaySkinId: PREMIUM_CHAMPAGNE_IVORY_SKIN_ID,
      holidayRules,
      skins: [onlySkin],
    };

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
      [JSON.stringify(config)],
    );
  },
};

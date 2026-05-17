const { normalizeThemeConfig, normalizeThemeSkinsPayload } = require('../src/modules/user/theme.service');

const ORGANIC_SANDSTONE_ID = 'organic_sandstone';

/**
 * 质朴砂岩：优惠券改为 premium，与邀请条共用粉红营销渐变（需配合前端 themeContrast 色板）。
 */
module.exports = {
  async up(query) {
    const [rows] = await query(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_skins' LIMIT 1",
    );
    if (!rows?.[0]?.setting_value) return;

    let payload;
    try {
      payload = normalizeThemeSkinsPayload(JSON.parse(rows[0].setting_value));
    } catch {
      return;
    }

    const idx = payload.skins.findIndex((s) => s.id === ORGANIC_SANDSTONE_ID);
    if (idx < 0) return;

    const skin = payload.skins[idx];
    payload.skins[idx] = {
      ...skin,
      config: normalizeThemeConfig({
        ...skin.config,
        couponStyle: 'premium',
      }),
    };

    await query(
      `UPDATE site_settings SET setting_value = ? WHERE setting_key = 'theme_skins'`,
      [JSON.stringify(payload)],
    );
  },
};

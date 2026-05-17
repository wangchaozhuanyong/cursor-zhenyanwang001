const { normalizeThemeSkinsPayload } = require('../src/modules/user/theme.service');
const { AETHERIAL_BLANC_SKIN_ID } = require('../src/modules/user/starterThemeSkins');

module.exports = {
  async down(query) {
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

    const filtered = payload.skins.filter((s) => s.id !== AETHERIAL_BLANC_SKIN_ID);
    if (filtered.length === payload.skins.length) return;

    const next = normalizeThemeSkinsPayload({
      defaultSkinId: payload.defaultSkinId,
      activeSkinId:
        payload.activeSkinId === AETHERIAL_BLANC_SKIN_ID
          ? filtered[0]?.id || payload.defaultSkinId
          : payload.activeSkinId,
      skins: filtered,
    });

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(next)],
    );
  },
};

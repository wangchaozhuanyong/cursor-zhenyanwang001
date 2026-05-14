const { DEFAULT_SKIN_ID, THEME_PRESETS } = require('../src/modules/user/theme.presets');

module.exports = {
  async up(query) {
    const rows = await query(
      "SELECT setting_value FROM site_settings WHERE setting_key='theme_skins' LIMIT 1",
    );
    let existing = null;
    if (Array.isArray(rows) && rows[0]?.setting_value) {
      try {
        existing = JSON.parse(rows[0].setting_value);
      } catch {
        existing = null;
      }
    }

    const presetMap = new Map(THEME_PRESETS.map((skin) => [skin.id, skin]));
    const userSkins = Array.isArray(existing?.skins)
      ? existing.skins.filter((skin) => skin && typeof skin.id === 'string' && !presetMap.has(String(skin.id)))
      : [];
    const mergedSkins = [...THEME_PRESETS, ...userSkins];
    const hasId = (id) => !!id && mergedSkins.some((skin) => skin.id === id);
    const defaultSkinId = hasId(existing?.defaultSkinId) ? existing.defaultSkinId : DEFAULT_SKIN_ID;
    const activeSkinId = hasId(existing?.activeSkinId)
      ? existing.activeSkinId
      : (hasId(defaultSkinId) ? defaultSkinId : DEFAULT_SKIN_ID);
    const skinPayload = { defaultSkinId, activeSkinId, skins: mergedSkins };
    const activeConfig = mergedSkins.find((skin) => skin.id === activeSkinId)?.config || THEME_PRESETS[0].config;

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = ?`,
      [JSON.stringify(skinPayload), JSON.stringify(skinPayload)],
    );

    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_config', ?)
       ON DUPLICATE KEY UPDATE setting_value = setting_value`,
      [JSON.stringify(activeConfig)],
    );
  },
};

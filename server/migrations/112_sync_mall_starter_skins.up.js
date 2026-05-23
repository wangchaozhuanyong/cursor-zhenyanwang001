const { normalizeThemeConfig, normalizeThemeSkinsPayload } = require('../src/modules/user/service/theme.service');
const {
  HAUTE_BLANC_SKIN,
  HAUTE_BLANC_SKIN_ID,
  AETHERIAL_BLANC_SKIN,
  AETHERIAL_BLANC_SKIN_ID,
  ORGANIC_SANDSTONE_SKIN,
  ORGANIC_SANDSTONE_SKIN_ID,
} = require('../src/modules/user/starterThemeSkins');

/** 将已入库的三套卖货向推荐皮肤与 starterThemeSkins.data.json 对齐（不新增 ID、不改 default/active）。 */
const STARTER_BY_ID = new Map([
  [ORGANIC_SANDSTONE_SKIN_ID, ORGANIC_SANDSTONE_SKIN],
  [HAUTE_BLANC_SKIN_ID, HAUTE_BLANC_SKIN],
  [AETHERIAL_BLANC_SKIN_ID, AETHERIAL_BLANC_SKIN],
]);

function applyStarterToSkin(existing, starter) {
  return {
    ...existing,
    name: starter.name,
    description: starter.description ?? existing.description,
    sceneTag: starter.sceneTag ?? existing.sceneTag,
    clientEnabled: starter.clientEnabled !== false,
    config: normalizeThemeConfig(starter.config),
  };
}

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

    let touched = false;
    const nextSkins = payload.skins.map((skin) => {
      const starter = STARTER_BY_ID.get(skin.id);
      if (!starter) return skin;
      touched = true;
      return applyStarterToSkin(skin, starter);
    });
    if (!touched) return;

    const next = normalizeThemeSkinsPayload({
      defaultSkinId: payload.defaultSkinId,
      activeSkinId: payload.activeSkinId,
      skins: nextSkins,
    });

    await query(
      `UPDATE site_settings SET setting_value = ? WHERE setting_key = 'theme_skins'`,
      [JSON.stringify(next)],
    );

    if (STARTER_BY_ID.has(next.activeSkinId)) {
      const active = next.skins.find((s) => s.id === next.activeSkinId);
      if (active?.config) {
        await query(
          `INSERT INTO site_settings (setting_key, setting_value)
           VALUES ('theme_config', ?)
           ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
          [JSON.stringify(normalizeThemeConfig(active.config))],
        );
      }
    }
  },
};

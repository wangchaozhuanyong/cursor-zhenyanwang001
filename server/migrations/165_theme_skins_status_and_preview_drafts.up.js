const {
  DEFAULT_SKIN_ID,
  THEME_PRESETS,
} = require('../src/modules/theme/theme.presets');
const { normalizeThemeConfig, normalizeThemeSkinsPayload } = require('../src/modules/theme/service/theme.service');

module.exports = {
  async up(query) {
    await query(
      `CREATE TABLE IF NOT EXISTS theme_skins (
        theme_key VARCHAR(64) NOT NULL PRIMARY KEY,
        name VARCHAR(80) NOT NULL,
        description VARCHAR(500) NULL,
        category VARCHAR(64) NULL,
        type ENUM('evergreen', 'festival') NOT NULL DEFAULT 'evergreen',
        status ENUM('draft', 'published', 'disabled') NOT NULL DEFAULT 'published',
        config_json JSON NOT NULL,
        draft_config_json JSON NULL,
        is_default TINYINT(1) NOT NULL DEFAULT 0,
        start_at DATE NULL,
        end_at DATE NULL,
        priority INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_theme_skins_status_priority (status, type, priority),
        INDEX idx_theme_skins_schedule (start_at, end_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    await query(
      `CREATE TABLE IF NOT EXISTS theme_preview_drafts (
        draft_token VARCHAR(96) NOT NULL PRIMARY KEY,
        theme_key VARCHAR(64) NOT NULL,
        config_json JSON NOT NULL,
        created_by BIGINT NULL,
        expires_at DATETIME NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_theme_preview_drafts_expires_at (expires_at),
        INDEX idx_theme_preview_drafts_theme_key (theme_key)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
    );

    const [rows] = await query(
      "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_skins' LIMIT 1",
    );
    let legacy = {};
    if (rows?.[0]?.setting_value) {
      try {
        legacy = JSON.parse(rows[0].setting_value);
      } catch {
        legacy = {};
      }
    }

    const normalizedLegacy = normalizeThemeSkinsPayload(legacy);
    const legacyActive = normalizedLegacy.skins.find((skin) => skin.id === normalizedLegacy.activeSkinId);
    const systemIds = new Set(THEME_PRESETS.map((skin) => skin.id));
    const seedSkins = [...THEME_PRESETS];
    if (legacyActive && !systemIds.has(legacyActive.id)) {
      seedSkins.push({
        ...legacyActive,
        type: legacyActive.type || 'evergreen',
        status: legacyActive.status || 'published',
        isDefault: true,
        priority: Math.max(legacyActive.priority || 0, 90),
        config: normalizeThemeConfig(legacyActive.config),
      });
    }

    const defaultSkinId = legacyActive && !systemIds.has(legacyActive.id) ? legacyActive.id : DEFAULT_SKIN_ID;
    const normalized = normalizeThemeSkinsPayload({
      defaultSkinId,
      activeSkinId: defaultSkinId,
      skins: seedSkins.map((skin) => ({
        ...skin,
        isDefault: skin.id === defaultSkinId || skin.isDefault === true,
        status: skin.status || 'published',
        config: normalizeThemeConfig(skin.config),
      })),
    });

    for (const skin of normalized.skins) {
      await query(
        `INSERT INTO theme_skins
          (theme_key, name, description, category, type, status, config_json, is_default, start_at, end_at, priority)
         VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE
          name = VALUES(name),
          description = VALUES(description),
          category = VALUES(category),
          type = VALUES(type),
          status = VALUES(status),
          config_json = VALUES(config_json),
          is_default = VALUES(is_default),
          start_at = VALUES(start_at),
          end_at = VALUES(end_at),
          priority = VALUES(priority),
          updated_at = CURRENT_TIMESTAMP`,
        [
          skin.id,
          skin.name,
          skin.description || null,
          skin.category || null,
          skin.type || 'evergreen',
          skin.status || 'published',
          JSON.stringify(normalizeThemeConfig(skin.config)),
          skin.id === defaultSkinId ? 1 : 0,
          skin.startAt || null,
          skin.endAt || null,
          skin.priority || 0,
        ],
      );
    }

    await query('UPDATE theme_skins SET is_default = 0 WHERE theme_key <> ?', [defaultSkinId]);
    await query('UPDATE theme_skins SET is_default = 1, status = "published" WHERE theme_key = ?', [defaultSkinId]);

    const runtime = normalized.skins.find((skin) => skin.id === normalized.runtimeSkinId) || normalized.skins[0];
    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_skins', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(normalized)],
    );
    await query(
      `INSERT INTO site_settings (setting_key, setting_value)
       VALUES ('theme_config', ?)
       ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
      [JSON.stringify(normalizeThemeConfig(runtime?.config))],
    );
  },
};

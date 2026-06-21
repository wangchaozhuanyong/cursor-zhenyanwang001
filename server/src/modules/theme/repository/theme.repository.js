const db = require('../../../config/db');

async function selectThemeConfigRaw() {
  const [rows] = await db.query(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_config' LIMIT 1",
  );
  return rows[0]?.setting_value || null;
}

async function selectThemeSkinsRaw() {
  const [rows] = await db.query(
    "SELECT setting_value FROM site_settings WHERE setting_key = 'theme_skins' LIMIT 1",
  );
  return rows[0]?.setting_value || null;
}

async function upsertThemeConfig(configJson) {
  await db.query(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES ('theme_config', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [configJson],
  );
}

async function upsertThemeSkins(skinsJson) {
  await db.query(
    `INSERT INTO site_settings (setting_key, setting_value)
     VALUES ('theme_skins', ?)
     ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
    [skinsJson],
  );
}

function isMissingTableError(error) {
  return error?.code === 'ER_NO_SUCH_TABLE' || error?.errno === 1146;
}

async function selectThemeSkinRows() {
  try {
    const [rows] = await db.query(
      `SELECT
         theme_key AS themeKey,
         name,
         description,
         category,
         type,
         status,
         config_json AS configJson,
         draft_config_json AS draftConfigJson,
         is_default AS isDefault,
         start_at AS startAt,
         end_at AS endAt,
         priority,
         updated_at AS updatedAt
       FROM theme_skins
       ORDER BY is_default DESC, priority DESC, updated_at DESC`,
    );
    return rows;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

async function upsertThemeSkin(row) {
  await db.query(
    `INSERT INTO theme_skins
       (theme_key, name, description, category, type, status, config_json, draft_config_json, is_default, start_at, end_at, priority)
     VALUES (?, ?, ?, ?, ?, ?, CAST(? AS JSON), CAST(? AS JSON), ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       description = VALUES(description),
       category = VALUES(category),
       type = VALUES(type),
       status = VALUES(status),
       config_json = VALUES(config_json),
       draft_config_json = VALUES(draft_config_json),
       is_default = VALUES(is_default),
       start_at = VALUES(start_at),
       end_at = VALUES(end_at),
       priority = VALUES(priority),
       updated_at = CURRENT_TIMESTAMP`,
    [
      row.themeKey,
      row.name,
      row.description || null,
      row.category || null,
      row.type,
      row.status,
      row.configJson,
      row.draftConfigJson ? JSON.stringify(JSON.parse(row.draftConfigJson)) : null,
      row.isDefault ? 1 : 0,
      row.startAt || null,
      row.endAt || null,
      row.priority || 0,
    ],
  );
}

async function updateThemeSkinDraft(themeKey, draftConfigJson) {
  const [result] = await db.query(
    `UPDATE theme_skins
     SET draft_config_json = CAST(? AS JSON), status = 'draft', updated_at = CURRENT_TIMESTAMP
     WHERE theme_key = ?`,
    [draftConfigJson, themeKey],
  );
  return result?.affectedRows || 0;
}

async function publishThemeSkinDraft(themeKey, fallbackConfigJson) {
  const [result] = await db.query(
    `UPDATE theme_skins
     SET config_json = COALESCE(draft_config_json, CAST(? AS JSON)),
         draft_config_json = NULL,
         status = 'published',
         updated_at = CURRENT_TIMESTAMP
     WHERE theme_key = ?`,
    [fallbackConfigJson, themeKey],
  );
  return result?.affectedRows || 0;
}

async function setOnlyDefaultThemeSkin(themeKey) {
  await db.query('UPDATE theme_skins SET is_default = 0 WHERE theme_key <> ?', [themeKey]);
  await db.query('UPDATE theme_skins SET is_default = 1, status = "published" WHERE theme_key = ?', [themeKey]);
}

async function updateThemeSkinStatus(themeKey, status) {
  const [result] = await db.query(
    'UPDATE theme_skins SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE theme_key = ?',
    [status, themeKey],
  );
  return result?.affectedRows || 0;
}

async function deleteExpiredPreviewDrafts(now) {
  try {
    await db.query('DELETE FROM theme_preview_drafts WHERE expires_at <= ?', [now]);
  } catch (error) {
    if (isMissingTableError(error)) return;
    throw error;
  }
}

async function insertPreviewDraft(row) {
  await db.query(
    `INSERT INTO theme_preview_drafts
       (draft_token, theme_key, config_json, created_by, expires_at)
     VALUES (?, ?, CAST(? AS JSON), ?, ?)
     ON DUPLICATE KEY UPDATE
       config_json = VALUES(config_json),
       expires_at = VALUES(expires_at),
       updated_at = CURRENT_TIMESTAMP`,
    [row.draftToken, row.themeKey, row.configJson, row.createdBy || null, row.expiresAt],
  );
}

async function selectPreviewDraft(draftToken, now) {
  try {
    const [rows] = await db.query(
      `SELECT draft_token AS draftToken, theme_key AS themeKey, config_json AS configJson, expires_at AS expiresAt
       FROM theme_preview_drafts
       WHERE draft_token = ? AND expires_at > ?
       LIMIT 1`,
      [draftToken, now],
    );
    return rows[0] || null;
  } catch (error) {
    if (isMissingTableError(error)) return null;
    throw error;
  }
}

module.exports = {
  selectThemeConfigRaw,
  selectThemeSkinsRaw,
  upsertThemeConfig,
  upsertThemeSkins,
  selectThemeSkinRows,
  upsertThemeSkin,
  updateThemeSkinDraft,
  publishThemeSkinDraft,
  setOnlyDefaultThemeSkin,
  updateThemeSkinStatus,
  deleteExpiredPreviewDrafts,
  insertPreviewDraft,
  selectPreviewDraft,
};

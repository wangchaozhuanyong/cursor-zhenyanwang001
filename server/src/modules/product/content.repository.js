const db = require('../../config/db');

exports.getSiteSettingsByKeys = (keys) => {
  const placeholders = keys.map(() => '?').join(',');
  return db.query(
    `SELECT setting_key, setting_value FROM site_settings WHERE setting_key IN (${placeholders})`,
    keys
  );
};

exports.getContentPageBySlug = (slug) =>
  db.query(
    `SELECT
       id,
       title,
       slug,
       body AS content,
       last_modified_at AS updated_at
     FROM content_pages
     WHERE slug = ? AND deleted_at IS NULL AND publish_status = 'published'`,
    [slug]
  );

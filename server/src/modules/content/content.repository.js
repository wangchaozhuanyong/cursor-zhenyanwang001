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
    'SELECT id, title, slug, content, updated_at FROM content_pages WHERE slug = ?',
    [slug]
  );

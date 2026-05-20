const { generateId } = require('../src/utils/helpers');
const {
  POLICY_PAGE_DEFAULTS,
  isPolicyPlaceholderBody,
  DEFAULT_POLICY_PATHS,
} = require('../src/data/defaultPolicyPageBodies');

/**
 * Seed privacy-policy / terms-of-service bodies when missing or placeholder.
 * Ensure policy paths in site_settings when empty.
 */
module.exports = {
  async up(query) {
    for (const [slug, page] of Object.entries(POLICY_PAGE_DEFAULTS)) {
      // eslint-disable-next-line no-await-in-loop
      const [[row]] = await query(
        'SELECT id, body FROM content_pages WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
        [slug],
      );
      if (!row) {
        // eslint-disable-next-line no-await-in-loop
        await query(
          `INSERT INTO content_pages (id, slug, title, body, publish_status, last_modified_at)
           VALUES (?, ?, ?, ?, 'published', NOW())`,
          [generateId(), slug, page.title, page.body],
        );
      } else if (isPolicyPlaceholderBody(row.body)) {
        // eslint-disable-next-line no-await-in-loop
        await query(
          'UPDATE content_pages SET body = ?, title = ?, last_modified_at = NOW() WHERE id = ?',
          [page.body, page.title, row.id],
        );
      }
    }

    for (const [key, value] of Object.entries(DEFAULT_POLICY_PATHS)) {
      // eslint-disable-next-line no-await-in-loop
      const [[setting]] = await query(
        'SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
        [key],
      );
      const current = String(setting?.setting_value || '').trim();
      if (!setting) {
        // eslint-disable-next-line no-await-in-loop
        await query(
          `INSERT INTO site_settings (setting_key, setting_value, updated_at)
           VALUES (?, ?, NOW())`,
          [key, value],
        );
      } else if (!current) {
        // eslint-disable-next-line no-await-in-loop
        await query(
          'UPDATE site_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = ?',
          [value, key],
        );
      }
    }
  },
};

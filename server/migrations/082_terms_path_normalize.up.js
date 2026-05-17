const { generateId } = require('../src/utils/helpers');

/**
 * Normalize policy defaults:
 * - ensure content page slug `terms-of-service` exists
 * - set site_settings.termsPath to /content/terms-of-service only when empty or old default /content/terms
 * - never override custom non-empty termsPath
 */
module.exports = {
  async up(query) {
    const [[termsPage]] = await query(
      'SELECT id FROM content_pages WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
      ['terms-of-service'],
    );
    if (!termsPage) {
      await query(
        `INSERT INTO content_pages (id, slug, title, body, publish_status, last_modified_at)
         VALUES (?, 'terms-of-service', '服务条款', '请在后台「内容管理」中维护服务条款正文。', 'published', NOW())`,
        [generateId()],
      );
    }

    const [[setting]] = await query(
      'SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
      ['termsPath'],
    );
    const current = String(setting?.setting_value || '').trim();

    if (!setting) {
      await query(
        `INSERT INTO site_settings (setting_key, setting_value, updated_at)
         VALUES ('termsPath', '/content/terms-of-service', NOW())`,
      );
      return;
    }

    if (!current || current === '/content/terms') {
      await query(
        `UPDATE site_settings
         SET setting_value = '/content/terms-of-service', updated_at = NOW()
         WHERE setting_key = 'termsPath'`,
      );
    }
  },
};

const { generateId } = require('../src/utils/helpers');
const { getDefaultHelpCenterConfigJson } = require('../src/data/defaultHelpCenterConfig');
const {
  DEFAULT_ABOUT_PAGE_BODY,
  isAboutPlaceholderBody,
} = require('../src/data/defaultAboutPageBody');

/**
 * Seed help center FAQ defaults + about page body when missing or still placeholder.
 * Never overwrites customized helpCenterConfig or about body.
 */
module.exports = {
  async up(query) {
    const helpJson = getDefaultHelpCenterConfigJson();

    const [[helpRow]] = await query(
      'SELECT setting_value FROM site_settings WHERE setting_key = ? LIMIT 1',
      ['helpCenterConfig'],
    );
    const helpCurrent = String(helpRow?.setting_value || '').trim();
    if (!helpRow) {
      await query(
        `INSERT INTO site_settings (setting_key, setting_value, updated_at)
         VALUES ('helpCenterConfig', ?, NOW())`,
        [helpJson],
      );
    } else if (!helpCurrent) {
      await query(
        `UPDATE site_settings SET setting_value = ?, updated_at = NOW() WHERE setting_key = 'helpCenterConfig'`,
        [helpJson],
      );
    }

    const [[aboutPage]] = await query(
      'SELECT id, body FROM content_pages WHERE slug = ? AND deleted_at IS NULL LIMIT 1',
      ['about'],
    );
    if (!aboutPage) {
      await query(
        `INSERT INTO content_pages (id, slug, title, body, publish_status, last_modified_at)
         VALUES (?, 'about', '关于我们', ?, 'published', NOW())`,
        [generateId(), DEFAULT_ABOUT_PAGE_BODY],
      );
      return;
    }

    if (isAboutPlaceholderBody(aboutPage.body)) {
      await query(
        `UPDATE content_pages SET body = ?, last_modified_at = NOW() WHERE id = ?`,
        [DEFAULT_ABOUT_PAGE_BODY, aboutPage.id],
      );
    }
  },
};

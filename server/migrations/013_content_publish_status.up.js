/**
 * 为内容型表添加发布状态字段：
 * - banners: publish_status (draft/published/revoked), last_modified_by
 * - notifications: publish_status, last_modified_by
 * - content_pages: publish_status, last_modified_by
 */
const TABLES = ['banners', 'notifications', 'content_pages'];

module.exports = {
  async up(query) {
    for (const table of TABLES) {
      try {
        await query(`ALTER TABLE ${table} ADD COLUMN publish_status VARCHAR(20) NOT NULL DEFAULT 'published'`);
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
      try {
        await query(`ALTER TABLE ${table} ADD COLUMN last_modified_by VARCHAR(36) DEFAULT NULL`);
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
      try {
        await query(`ALTER TABLE ${table} ADD COLUMN last_modified_at DATETIME DEFAULT NULL`);
      } catch (e) { if (e.code !== 'ER_DUP_FIELDNAME') throw e; }
    }
  },
};

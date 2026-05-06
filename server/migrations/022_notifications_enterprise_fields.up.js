async function hasColumn(query, columnName) {
  const result = await query(
    `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = ?`,
    [columnName],
  );
  const rows = Array.isArray(result) && Array.isArray(result[0]) ? result[0] : result;
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  name: '022_notifications_enterprise_fields',
  async up(query) {
    if (!(await hasColumn(query, 'workflow_status'))) {
      await query("ALTER TABLE notifications ADD COLUMN workflow_status VARCHAR(20) NOT NULL DEFAULT 'published' AFTER send_status");
      await query('ALTER TABLE notifications ADD INDEX idx_notifications_workflow_status (workflow_status)');
    }
    if (!(await hasColumn(query, 'template_code'))) {
      await query('ALTER TABLE notifications ADD COLUMN template_code VARCHAR(64) NULL AFTER workflow_status');
    }
    if (!(await hasColumn(query, 'link_url'))) {
      await query('ALTER TABLE notifications ADD COLUMN link_url VARCHAR(500) NULL AFTER template_code');
    }
  },
};

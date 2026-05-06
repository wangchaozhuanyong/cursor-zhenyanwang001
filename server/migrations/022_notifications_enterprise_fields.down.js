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
  async down(query) {
    if (await hasColumn(query, 'link_url')) {
      await query('ALTER TABLE notifications DROP COLUMN link_url');
    }
    if (await hasColumn(query, 'template_code')) {
      await query('ALTER TABLE notifications DROP COLUMN template_code');
    }
    if (await hasColumn(query, 'workflow_status')) {
      await query('ALTER TABLE notifications DROP INDEX idx_notifications_workflow_status');
      await query('ALTER TABLE notifications DROP COLUMN workflow_status');
    }
  },
};

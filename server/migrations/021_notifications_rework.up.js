async function hasColumn(query, columnName) {
  const [rows] = await query(
    `SELECT 1
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'notifications'
        AND COLUMN_NAME = ?
      LIMIT 1`,
    [columnName],
  );
  return Array.isArray(rows) && rows.length > 0;
}

module.exports = {
  async up(query) {
    if (!(await hasColumn(query, 'batch_id'))) {
      await query('ALTER TABLE notifications ADD COLUMN batch_id VARCHAR(36) NULL AFTER id');
      await query('ALTER TABLE notifications ADD INDEX idx_notifications_batch (batch_id)');
    }
    if (!(await hasColumn(query, 'audience_type'))) {
      await query("ALTER TABLE notifications ADD COLUMN audience_type VARCHAR(32) NOT NULL DEFAULT 'single' AFTER type");
    }
    if (!(await hasColumn(query, 'audience_value'))) {
      await query('ALTER TABLE notifications ADD COLUMN audience_value VARCHAR(255) NULL AFTER audience_type');
    }
    if (!(await hasColumn(query, 'send_status'))) {
      await query("ALTER TABLE notifications ADD COLUMN send_status VARCHAR(20) NOT NULL DEFAULT 'sent' AFTER publish_status");
      await query('ALTER TABLE notifications ADD INDEX idx_notifications_send_status (send_status)');
    }
    if (!(await hasColumn(query, 'scheduled_at'))) {
      await query('ALTER TABLE notifications ADD COLUMN scheduled_at DATETIME NULL AFTER send_status');
    }
    if (!(await hasColumn(query, 'sent_at'))) {
      await query('ALTER TABLE notifications ADD COLUMN sent_at DATETIME NULL AFTER scheduled_at');
    }
    if (!(await hasColumn(query, 'deleted_at'))) {
      await query('ALTER TABLE notifications ADD COLUMN deleted_at DATETIME NULL AFTER sent_at');
      await query('ALTER TABLE notifications ADD INDEX idx_notifications_deleted_at (deleted_at)');
    }
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

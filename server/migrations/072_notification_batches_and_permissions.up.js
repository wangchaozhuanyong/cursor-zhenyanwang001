module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS notification_batches (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        type VARCHAR(32) NOT NULL,
        audience_type VARCHAR(32) NOT NULL,
        audience_value VARCHAR(255) DEFAULT NULL,
        link_url VARCHAR(500) DEFAULT NULL,
        template_code VARCHAR(64) DEFAULT NULL,
        send_status VARCHAR(20) NOT NULL DEFAULT 'draft',
        workflow_status VARCHAR(20) NOT NULL DEFAULT 'draft',
        scheduled_at DATETIME DEFAULT NULL,
        sent_at DATETIME DEFAULT NULL,
        created_by VARCHAR(36) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        INDEX idx_nb_created_at (created_at),
        INDEX idx_nb_send_status (send_status),
        INDEX idx_nb_workflow_status (workflow_status),
        INDEX idx_nb_deleted_at (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT IGNORE INTO permissions (code, name, sort_order) VALUES
      ('notification.view', '通知查看', 121),
      ('notification.create', '通知草稿', 122),
      ('notification.send', '通知发布', 123),
      ('notification.revoke', '通知撤回', 124),
      ('notification.template', '通知模板', 125),
      ('notification.trigger', '通知触发', 126)
    `);

    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT rp.role_id, pnew.id
      FROM role_permissions rp
      JOIN permissions pold ON pold.id = rp.permission_id AND pold.code = 'notification.manage'
      JOIN permissions pnew ON pnew.code IN (
        'notification.view','notification.create','notification.send','notification.revoke','notification.template','notification.trigger'
      )
    `);
  },
};

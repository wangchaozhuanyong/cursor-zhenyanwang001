module.exports = {
  async down(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS admin_logs (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        admin_id VARCHAR(36) NULL,
        operator VARCHAR(100) NOT NULL DEFAULT '',
        action VARCHAR(100) NOT NULL,
        detail TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_admin_logs_created_at (created_at),
        KEY idx_admin_logs_admin_id (admin_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT IGNORE INTO permissions (code, name, sort_order)
      VALUES ('admin_log.view', '操作日志', 999)
    `);
  },
};

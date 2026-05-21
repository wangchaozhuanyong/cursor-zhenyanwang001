module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS data_cleanup_policies (
        policy_key VARCHAR(80) NOT NULL PRIMARY KEY,
        title VARCHAR(160) NOT NULL,
        description VARCHAR(1000) NOT NULL DEFAULT '',
        category VARCHAR(40) NOT NULL DEFAULT 'system',
        table_name VARCHAR(120) NOT NULL DEFAULT '',
        date_column VARCHAR(80) NOT NULL DEFAULT '',
        delete_mode VARCHAR(32) NOT NULL DEFAULT 'hard_delete',
        retention_days INT NOT NULL,
        default_retention_days INT NOT NULL,
        min_retention_days INT NOT NULL DEFAULT 1,
        batch_size INT NOT NULL DEFAULT 1000,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        locked TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_dcp_enabled (enabled),
        KEY idx_dcp_category (category),
        KEY idx_dcp_table (table_name)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS data_cleanup_runs (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        run_type VARCHAR(24) NOT NULL DEFAULT 'manual',
        status VARCHAR(32) NOT NULL DEFAULT 'running',
        triggered_by VARCHAR(36) DEFAULT NULL,
        preview_run_id BIGINT UNSIGNED DEFAULT NULL,
        preview_consumed_at DATETIME DEFAULT NULL,
        policy_keys JSON NULL,
        total_matched INT NOT NULL DEFAULT 0,
        total_deleted INT NOT NULL DEFAULT 0,
        total_failed INT NOT NULL DEFAULT 0,
        cancel_requested TINYINT(1) NOT NULL DEFAULT 0,
        request_snapshot JSON NULL,
        error_message TEXT NULL,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME DEFAULT NULL,
        duration_ms INT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_dcr_status_started (status, started_at),
        KEY idx_dcr_type_started (run_type, started_at),
        KEY idx_dcr_triggered (triggered_by, started_at),
        KEY idx_dcr_preview (preview_run_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS data_cleanup_run_steps (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        run_id BIGINT UNSIGNED NOT NULL,
        policy_key VARCHAR(80) NOT NULL,
        table_name VARCHAR(120) NOT NULL DEFAULT '',
        status VARCHAR(32) NOT NULL DEFAULT 'running',
        cutoff_at DATETIME DEFAULT NULL,
        matched_count INT NOT NULL DEFAULT 0,
        deleted_count INT NOT NULL DEFAULT 0,
        batch_size INT NOT NULL DEFAULT 1000,
        batch_count INT NOT NULL DEFAULT 0,
        sample_ids JSON NULL,
        error_message TEXT NULL,
        started_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        finished_at DATETIME DEFAULT NULL,
        duration_ms INT DEFAULT NULL,
        KEY idx_dcrs_run (run_id),
        KEY idx_dcrs_policy (policy_key),
        KEY idx_dcrs_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS data_cleanup_locks (
        lock_name VARCHAR(80) NOT NULL PRIMARY KEY,
        owner_id VARCHAR(80) NOT NULL,
        acquired_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        expires_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_dcl_expires (expires_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT IGNORE INTO permissions (code, name, sort_order) VALUES
      ('data_cleanup.view', '数据清理查看', 200),
      ('data_cleanup.manage', '数据清理策略管理', 201),
      ('data_cleanup.execute', '数据清理执行', 202)
    `);

    for (const roleCode of ['super_admin', 'admin_manager']) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r
         JOIN permissions p ON p.code IN ('data_cleanup.view', 'data_cleanup.manage', 'data_cleanup.execute')
         WHERE r.code = ?`,
        [roleCode],
      );
    }
  },
};

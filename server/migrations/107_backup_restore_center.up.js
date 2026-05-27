const PERMISSIONS = [
  ['backup.view', '备份查看'],
  ['backup.create', '创建备份'],
  ['backup.restore.request', '创建恢复任务'],
  ['backup.restore.approve', '确认恢复任务'],
];

module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS backup_jobs (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        job_type ENUM('full','long_term_full','pre_deploy','pre_migration','pre_cleanup','pre_restore_switch','config','uploads','binlog_sync','restore_drill') NOT NULL,
        status ENUM('queued','running','success','failed','cancelled') NOT NULL DEFAULT 'queued',
        trigger_source ENUM('schedule','manual','deploy','migration','cleanup','system') NOT NULL DEFAULT 'system',
        triggered_by VARCHAR(36) DEFAULT NULL,
        reason VARCHAR(255) NOT NULL DEFAULT '',
        started_at DATETIME DEFAULT NULL,
        finished_at DATETIME DEFAULT NULL,
        error_message VARCHAR(1000) NOT NULL DEFAULT '',
        metadata JSON DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_backup_jobs_type_status (job_type, status),
        INDEX idx_backup_jobs_created (created_at),
        INDEX idx_backup_jobs_finished (finished_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS backup_files (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        backup_job_id VARCHAR(36) NOT NULL,
        file_kind ENUM('mysql_full','mysql_binlog','config','uploads','report') NOT NULL,
        storage_provider VARCHAR(32) NOT NULL DEFAULT 's3',
        bucket VARCHAR(128) NOT NULL DEFAULT '',
        storage_key VARCHAR(1024) NOT NULL,
        local_path VARCHAR(1024) NOT NULL DEFAULT '',
        size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
        sha256 CHAR(64) NOT NULL DEFAULT '',
        encrypted TINYINT(1) NOT NULL DEFAULT 1,
        encryption_key_id VARCHAR(128) NOT NULL DEFAULT '',
        compression VARCHAR(32) NOT NULL DEFAULT 'gzip',
        binlog_file VARCHAR(255) DEFAULT NULL,
        binlog_position BIGINT UNSIGNED DEFAULT NULL,
        gtid_set TEXT DEFAULT NULL,
        recoverable_at DATETIME DEFAULT NULL,
        retention_tier ENUM('short','long','locked') NOT NULL DEFAULT 'short',
        object_lock_until DATETIME DEFAULT NULL,
        verified_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_backup_file_storage (storage_provider, bucket, storage_key(255)),
        INDEX idx_backup_files_job (backup_job_id),
        INDEX idx_backup_files_kind_created (file_kind, created_at),
        INDEX idx_backup_files_recoverable (recoverable_at),
        CONSTRAINT fk_backup_files_job FOREIGN KEY (backup_job_id) REFERENCES backup_jobs(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS binlog_files (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        file_name VARCHAR(255) NOT NULL,
        storage_provider VARCHAR(32) NOT NULL DEFAULT 's3',
        bucket VARCHAR(128) NOT NULL DEFAULT '',
        storage_key VARCHAR(1024) NOT NULL,
        size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
        sha256 CHAR(64) NOT NULL DEFAULT '',
        first_event_at DATETIME DEFAULT NULL,
        last_event_at DATETIME DEFAULT NULL,
        uploaded_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        upload_status ENUM('success','failed') NOT NULL DEFAULT 'success',
        error_message VARCHAR(1000) NOT NULL DEFAULT '',
        UNIQUE KEY uk_binlog_file_storage (storage_provider, bucket, storage_key(255)),
        INDEX idx_binlog_uploaded (uploaded_at),
        INDEX idx_binlog_last_event (last_event_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS restore_jobs (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        restore_type ENUM('site','point_in_time','table','order','user','pre_deploy_rollback') NOT NULL,
        status ENUM('queued','running','temp_restored','validated','awaiting_approval','approved','merged','switched','failed','cancelled') NOT NULL DEFAULT 'queued',
        source_backup_file_id VARCHAR(36) DEFAULT NULL,
        target_time DATETIME DEFAULT NULL,
        target_table VARCHAR(128) DEFAULT NULL,
        target_entity_id VARCHAR(64) DEFAULT NULL,
        temp_db_name VARCHAR(128) NOT NULL DEFAULT '',
        requested_by VARCHAR(36) DEFAULT NULL,
        approved_by VARCHAR(36) DEFAULT NULL,
        mfa_verified_at DATETIME DEFAULT NULL,
        validation_result JSON DEFAULT NULL,
        diff_summary JSON DEFAULT NULL,
        error_message VARCHAR(1000) NOT NULL DEFAULT '',
        started_at DATETIME DEFAULT NULL,
        finished_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_restore_jobs_status (status),
        INDEX idx_restore_jobs_created (created_at),
        INDEX idx_restore_jobs_requested (requested_by),
        CONSTRAINT fk_restore_source_file FOREIGN KEY (source_backup_file_id) REFERENCES backup_files(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS restore_drill_reports (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        backup_file_id VARCHAR(36) DEFAULT NULL,
        restore_job_id VARCHAR(36) DEFAULT NULL,
        status ENUM('running','success','failed') NOT NULL DEFAULT 'running',
        temp_db_name VARCHAR(128) NOT NULL DEFAULT '',
        table_counts JSON DEFAULT NULL,
        duration_seconds INT UNSIGNED DEFAULT NULL,
        report_json JSON DEFAULT NULL,
        error_message VARCHAR(1000) NOT NULL DEFAULT '',
        started_at DATETIME DEFAULT NULL,
        finished_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_restore_drill_status (status, created_at),
        CONSTRAINT fk_restore_drill_file FOREIGN KEY (backup_file_id) REFERENCES backup_files(id) ON DELETE SET NULL,
        CONSTRAINT fk_restore_drill_job FOREIGN KEY (restore_job_id) REFERENCES restore_jobs(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS backup_alerts (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        alert_type ENUM('full_failed','binlog_upload_failed','s3_upload_failed','verify_failed','stale_backup','restore_drill_failed','disk_low','restore_failed') NOT NULL,
        severity ENUM('P0','P1','P2','P3') NOT NULL DEFAULT 'P1',
        status ENUM('open','acknowledged','resolved') NOT NULL DEFAULT 'open',
        title VARCHAR(255) NOT NULL,
        message VARCHAR(1000) NOT NULL DEFAULT '',
        related_job_id VARCHAR(36) DEFAULT NULL,
        related_file_id VARCHAR(36) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        resolved_at DATETIME DEFAULT NULL,
        INDEX idx_backup_alert_status (status, severity, created_at),
        INDEX idx_backup_alert_type (alert_type)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS backup_settings (
        setting_key VARCHAR(80) NOT NULL PRIMARY KEY,
        setting_value JSON DEFAULT NULL,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    for (let i = 0; i < PERMISSIONS.length; i += 1) {
      const [code, name] = PERMISSIONS[i];
      await query(
        `INSERT IGNORE INTO permissions (code, name, sort_order) VALUES (?, ?, ?)`,
        [code, name, 300 + i],
      );
    }

    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.code IN ('backup.view','backup.create','backup.restore.request','backup.restore.approve')
      WHERE r.code IN ('super_admin','admin_manager')
    `);
  },
};

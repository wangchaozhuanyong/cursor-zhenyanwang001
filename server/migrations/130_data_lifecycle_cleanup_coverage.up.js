module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE data_cleanup_runs
      ADD COLUMN backup_job_id VARCHAR(36) NULL AFTER preview_run_id
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE data_cleanup_runs
      ADD INDEX idx_dcr_backup_job (backup_job_id)
    `).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS data_cleanup_file_candidates (
        id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        preview_run_id BIGINT UNSIGNED NOT NULL,
        policy_key VARCHAR(80) NOT NULL,
        storage_provider VARCHAR(32) NOT NULL,
        object_key VARCHAR(1024) NOT NULL DEFAULT '',
        local_path VARCHAR(1024) NOT NULL DEFAULT '',
        public_url VARCHAR(1500) NOT NULL DEFAULT '',
        size_bytes BIGINT UNSIGNED NOT NULL DEFAULT 0,
        last_modified_at DATETIME DEFAULT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'candidate',
        error_message TEXT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_cleanup_file_candidate (preview_run_id, policy_key, storage_provider, object_key(255), local_path(255)),
        KEY idx_cleanup_file_candidate_preview (preview_run_id, policy_key, status),
        KEY idx_cleanup_file_candidate_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};

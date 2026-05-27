async function addColumn(query, table, definition) {
  await query(`ALTER TABLE ${table} ADD COLUMN ${definition}`).catch((error) => {
    if (error.code !== 'ER_DUP_FIELDNAME') throw error;
  });
}

async function addIndex(query, table, definition) {
  await query(`ALTER TABLE ${table} ADD ${definition}`).catch((error) => {
    if (error.code !== 'ER_DUP_KEYNAME') throw error;
  });
}

module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE backup_jobs
      MODIFY COLUMN job_type ENUM('full','long_term_full','pre_deploy','pre_migration','pre_cleanup','pre_restore_switch','config','uploads','binlog_sync','restore_drill') NOT NULL
    `).catch(() => {});

    await addColumn(
      query,
      'backup_files',
      "verification_status ENUM('pending','running','passed','failed','skipped') NOT NULL DEFAULT 'pending' AFTER verified_at",
    );
    await addColumn(query, 'backup_files', 'verification_report JSON DEFAULT NULL AFTER verification_status');
    await addColumn(query, 'backup_files', 'manifest_json JSON DEFAULT NULL AFTER verification_report');
    await addIndex(query, 'backup_files', 'KEY idx_backup_files_verify (verification_status, verified_at)');

    await addColumn(query, 'restore_jobs', 'operator_ip VARCHAR(45) DEFAULT NULL AFTER approved_by');
    await addColumn(query, 'restore_jobs', "restore_source VARCHAR(255) NOT NULL DEFAULT '' AFTER diff_summary");
    await addColumn(query, 'restore_jobs', "target_database VARCHAR(128) NOT NULL DEFAULT '' AFTER restore_source");
    await addColumn(query, 'restore_jobs', 'rollback_backup_job_id VARCHAR(36) DEFAULT NULL AFTER target_database');
    await addIndex(query, 'restore_jobs', 'KEY idx_restore_jobs_rollback_backup (rollback_backup_job_id)');

    await query(`
      UPDATE backup_files
         SET verification_status = CASE WHEN verified_at IS NULL THEN 'pending' ELSE 'passed' END
       WHERE verification_status IS NULL OR verification_status = 'pending'
    `).catch(() => {});
  },
};

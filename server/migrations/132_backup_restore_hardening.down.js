module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE backup_jobs
      MODIFY COLUMN job_type ENUM('full','long_term_full','pre_deploy','pre_migration','pre_cleanup','config','uploads','binlog_sync','restore_drill') NOT NULL
    `).catch(() => {});

    await query('ALTER TABLE restore_jobs DROP KEY idx_restore_jobs_rollback_backup').catch(() => {});
    await query('ALTER TABLE restore_jobs DROP COLUMN rollback_backup_job_id').catch(() => {});
    await query('ALTER TABLE restore_jobs DROP COLUMN target_database').catch(() => {});
    await query('ALTER TABLE restore_jobs DROP COLUMN restore_source').catch(() => {});
    await query('ALTER TABLE restore_jobs DROP COLUMN operator_ip').catch(() => {});

    await query('ALTER TABLE backup_files DROP KEY idx_backup_files_verify').catch(() => {});
    await query('ALTER TABLE backup_files DROP COLUMN manifest_json').catch(() => {});
    await query('ALTER TABLE backup_files DROP COLUMN verification_report').catch(() => {});
    await query('ALTER TABLE backup_files DROP COLUMN verification_status').catch(() => {});
  },
};

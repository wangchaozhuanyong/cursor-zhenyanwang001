module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS data_cleanup_file_candidates').catch(() => {});
    await query('ALTER TABLE data_cleanup_runs DROP INDEX idx_dcr_backup_job').catch(() => {});
    await query('ALTER TABLE data_cleanup_runs DROP COLUMN backup_job_id').catch(() => {});
  },
};

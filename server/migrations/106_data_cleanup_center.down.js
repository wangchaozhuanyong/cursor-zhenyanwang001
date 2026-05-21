module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS data_cleanup_locks').catch(() => {});
    await query('DROP TABLE IF EXISTS data_cleanup_run_steps').catch(() => {});
    await query('DROP TABLE IF EXISTS data_cleanup_runs').catch(() => {});
    await query('DROP TABLE IF EXISTS data_cleanup_policies').catch(() => {});
  },
};

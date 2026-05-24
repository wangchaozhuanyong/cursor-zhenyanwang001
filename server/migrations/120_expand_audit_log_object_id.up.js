module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE audit_logs
      MODIFY object_id VARCHAR(191) DEFAULT NULL
    `);
  },
};

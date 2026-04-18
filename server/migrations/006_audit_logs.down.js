module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS audit_logs');
  },
};

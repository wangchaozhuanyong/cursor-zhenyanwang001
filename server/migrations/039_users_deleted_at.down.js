module.exports = {
  async down(query) {
    try {
      await query('DROP INDEX idx_users_deleted ON users');
    } catch {
      /* ignore */
    }
    try {
      await query('ALTER TABLE users DROP COLUMN deleted_at');
    } catch {
      /* ignore */
    }
  },
};

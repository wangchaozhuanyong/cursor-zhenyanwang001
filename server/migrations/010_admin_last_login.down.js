module.exports = {
  async down(query) {
    try { await query("ALTER TABLE users DROP COLUMN last_login_at"); } catch { /* ignore */ }
  },
};

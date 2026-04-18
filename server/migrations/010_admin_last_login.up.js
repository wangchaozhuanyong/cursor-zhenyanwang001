module.exports = {
  async up(query) {
    try {
      await query("ALTER TABLE users ADD COLUMN last_login_at DATETIME DEFAULT NULL");
    } catch (e) {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    }
  },
};

module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE admin_mfa_settings
        ADD COLUMN required TINYINT(1) NOT NULL DEFAULT 0 AFTER enabled
    `).catch((err) => {
      if (!/Duplicate column name/i.test(String(err && err.message))) throw err;
    });
  },
};

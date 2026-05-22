module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE admin_mfa_settings
        DROP COLUMN required
    `).catch((err) => {
      if (!/check that column\/key exists|unknown column/i.test(String(err && err.message))) throw err;
    });
  },
};

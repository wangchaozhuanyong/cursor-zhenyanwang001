module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE browsing_history
      DROP INDEX idx_bh_user_viewed
    `);

    await query(`
      ALTER TABLE browsing_history
      DROP COLUMN viewed_at
    `);
  },
};

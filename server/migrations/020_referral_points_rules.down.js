module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS referral_rules');
    await query('DROP TABLE IF EXISTS points_rules');
  },
};

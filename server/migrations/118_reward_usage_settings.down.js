module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS reward_usage_settings');
  },
};

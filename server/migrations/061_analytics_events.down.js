module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS analytics_events');
  },
};


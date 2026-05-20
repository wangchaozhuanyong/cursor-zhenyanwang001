module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS notification_logs').catch(() => {});
  },
};

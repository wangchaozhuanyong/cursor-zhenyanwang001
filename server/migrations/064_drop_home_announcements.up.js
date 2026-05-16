module.exports = {
  async up(query) {
    await query('DROP TABLE IF EXISTS home_announcements');
  },
};

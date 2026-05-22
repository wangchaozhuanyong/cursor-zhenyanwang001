module.exports = {
  async up(query) {
    await query('ALTER TABLE users DROP COLUMN admin_order_voice_enabled');
  },
};

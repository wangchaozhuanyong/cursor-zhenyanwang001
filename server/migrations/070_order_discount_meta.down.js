module.exports = {
  async up(query) {
    await query('ALTER TABLE orders DROP COLUMN discount_meta').catch(() => {});
  },
};

module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS promotion_usages');
  },
};

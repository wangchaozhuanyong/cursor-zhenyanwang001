module.exports = {
  async down(query) {
    await query('ALTER TABLE orders DROP COLUMN shipping_phone').catch(() => {});
  },
};


module.exports = {
  async down(query) {
    await query('ALTER TABLE orders DROP COLUMN refunded_amount').catch(() => {});
  },
};

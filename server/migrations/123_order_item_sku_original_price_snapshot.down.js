module.exports = {
  async down(query) {
    await query('ALTER TABLE order_items DROP COLUMN unit_original_price').catch(() => {});
  },
};

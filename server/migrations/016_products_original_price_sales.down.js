module.exports = {
  async down(query) {
    await query('DROP INDEX idx_products_sales_count ON products').catch(() => {});
    await query('ALTER TABLE products DROP COLUMN sales_count').catch(() => {});
    await query('ALTER TABLE products DROP COLUMN original_price').catch(() => {});
  },
};

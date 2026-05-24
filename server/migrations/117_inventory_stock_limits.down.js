module.exports = {
  async down(query) {
    await query('ALTER TABLE product_variants DROP COLUMN stock_upper_limit').catch(() => {});
    await query('ALTER TABLE product_variants DROP COLUMN stock_lower_limit').catch(() => {});
    await query('ALTER TABLE products DROP COLUMN stock_upper_limit').catch(() => {});
    await query('ALTER TABLE products DROP COLUMN stock_lower_limit').catch(() => {});
  },
};

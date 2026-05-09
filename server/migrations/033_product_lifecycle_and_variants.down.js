module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS product_variants');
    await query('ALTER TABLE products DROP INDEX idx_products_lifecycle').catch(() => {});
    await query('ALTER TABLE products DROP COLUMN lifecycle_status').catch(() => {});
  },
};

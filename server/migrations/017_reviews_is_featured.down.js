module.exports = {
  async down(query) {
    await query('DROP INDEX idx_reviews_is_featured ON product_reviews').catch(() => {});
    await query('ALTER TABLE product_reviews DROP COLUMN is_featured').catch(() => {});
  },
};

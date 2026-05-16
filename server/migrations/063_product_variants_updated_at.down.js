module.exports = {
  async down(query) {
    await query(`ALTER TABLE product_variants DROP COLUMN updated_at`).catch(() => {});
  },
};

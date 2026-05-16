module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE product_variants
      ADD COLUMN updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      AFTER created_at
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      UPDATE product_variants
      SET updated_at = COALESCE(updated_at, created_at, NOW())
      WHERE updated_at IS NULL
    `);
  },
};

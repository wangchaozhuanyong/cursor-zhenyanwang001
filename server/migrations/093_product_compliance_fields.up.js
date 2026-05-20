module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE products
      ADD COLUMN is_age_restricted TINYINT(1) NOT NULL DEFAULT 0 AFTER sales_count
    `).catch(() => {});

    await query(`
      ALTER TABLE products
      ADD COLUMN minimum_age INT NULL AFTER is_age_restricted
    `).catch(() => {});

    await query(`
      ALTER TABLE products
      ADD COLUMN compliance_type VARCHAR(64) NULL AFTER minimum_age
    `).catch(() => {});

    await query(`
      ALTER TABLE products
      ADD COLUMN region_notice VARCHAR(255) NULL AFTER compliance_type
    `).catch(() => {});

    await query(`
      ALTER TABLE products
      ADD COLUMN compliance_notice TEXT NULL AFTER region_notice
    `).catch(() => {});

    await query(`
      ALTER TABLE products
      ADD COLUMN allow_index TINYINT(1) NOT NULL DEFAULT 1 AFTER compliance_notice
    `).catch(() => {});

    await query(`
      UPDATE products
      SET compliance_type = 'normal'
      WHERE compliance_type IS NULL OR compliance_type = ''
    `).catch(() => {});
  },
};

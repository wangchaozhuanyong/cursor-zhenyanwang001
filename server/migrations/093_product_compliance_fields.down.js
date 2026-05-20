module.exports = {
  async down(query) {
    await query(`ALTER TABLE products DROP COLUMN allow_index`).catch(() => {});
    await query(`ALTER TABLE products DROP COLUMN compliance_notice`).catch(() => {});
    await query(`ALTER TABLE products DROP COLUMN region_notice`).catch(() => {});
    await query(`ALTER TABLE products DROP COLUMN compliance_type`).catch(() => {});
    await query(`ALTER TABLE products DROP COLUMN minimum_age`).catch(() => {});
    await query(`ALTER TABLE products DROP COLUMN is_age_restricted`).catch(() => {});
  },
};

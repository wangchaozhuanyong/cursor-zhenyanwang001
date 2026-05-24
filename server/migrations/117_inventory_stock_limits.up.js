module.exports = {
  async up(query) {
    await query(`ALTER TABLE products ADD COLUMN stock_lower_limit INT NULL AFTER stock_warning_threshold`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE products ADD COLUMN stock_upper_limit INT NULL AFTER stock_lower_limit`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE product_variants ADD COLUMN stock_lower_limit INT NULL AFTER stock_warning_threshold`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE product_variants ADD COLUMN stock_upper_limit INT NULL AFTER stock_lower_limit`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
  },
};

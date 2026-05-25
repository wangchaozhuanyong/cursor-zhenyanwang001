module.exports = {
  async up(query) {
    await query(
      `ALTER TABLE order_items ADD COLUMN unit_original_price DECIMAL(12,2) NULL AFTER price`,
    ).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
  },
};

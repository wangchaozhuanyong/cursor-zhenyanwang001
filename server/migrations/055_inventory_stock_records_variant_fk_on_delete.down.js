module.exports = {
  async down(query) {
    await query(`
      ALTER TABLE inventory_stock_records
      DROP FOREIGN KEY fk_inv_variant
    `).catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });

    await query(`
      ALTER TABLE inventory_stock_records
      ADD CONSTRAINT fk_inv_variant
      FOREIGN KEY (variant_id) REFERENCES product_variants(id)
    `);
  },
};

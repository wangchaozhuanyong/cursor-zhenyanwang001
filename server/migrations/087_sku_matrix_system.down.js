module.exports = {
  async down(query) {
    const dropColumn = async (sql) => {
      await query(sql).catch((e) => {
        if (e.code !== 'ER_CANT_DROP_FIELD' && e.code !== 'ER_BAD_FIELD_ERROR') throw e;
      });
    };

    await dropColumn(`ALTER TABLE order_items DROP COLUMN variant_image_snapshot`);
    await dropColumn(`ALTER TABLE order_items DROP COLUMN product_image_snapshot`);
    await dropColumn(`ALTER TABLE order_items DROP COLUMN product_name_snapshot`);
    await dropColumn(`ALTER TABLE order_items DROP COLUMN spec_snapshot`);

    await dropColumn(`ALTER TABLE product_variants DROP COLUMN enabled`);
    await dropColumn(`ALTER TABLE product_variants DROP COLUMN weight`);
    await dropColumn(`ALTER TABLE product_variants DROP COLUMN image_url`);
    await dropColumn(`ALTER TABLE product_variants DROP COLUMN original_price`);

    await query(`DROP TABLE IF EXISTS product_variant_spec_values`);
    await query(`DROP TABLE IF EXISTS product_spec_values`);
    await query(`DROP TABLE IF EXISTS product_spec_groups`);
  },
};

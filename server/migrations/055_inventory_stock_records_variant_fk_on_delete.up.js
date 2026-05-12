module.exports = {
  /**
   * 后台保存商品时会 replaceProductVariants：先删再插 SKU。
   * inventory_stock_records.variant_id 若仍指向旧 SKU，无 ON DELETE 时会触发
   * ER_ROW_IS_REFERENCED_2，表现为「服务器内部错误」。
   * 将外键改为 ON DELETE SET NULL，保留流水、释放 SKU 行以便重建。
   */
  async up(query) {
    await query(`
      ALTER TABLE inventory_stock_records
      DROP FOREIGN KEY fk_inv_variant
    `).catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });

    await query(`
      ALTER TABLE inventory_stock_records
      ADD CONSTRAINT fk_inv_variant
      FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE SET NULL
    `);
  },
};

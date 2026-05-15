module.exports = {
  async down(query) {
    await query(`DROP INDEX idx_variant_deleted_at ON product_variants`).catch(() => {});
    await query(`DROP INDEX idx_variant_product_id ON product_variants`).catch(() => {});
    await query(`DROP INDEX idx_variant_sku_code ON product_variants`).catch(() => {});

    await query(`DROP INDEX idx_inv_operator_id ON inventory_stock_records`).catch(() => {});
    await query(`DROP INDEX idx_inv_created_at ON inventory_stock_records`).catch(() => {});
    await query(`DROP INDEX idx_inv_change_type ON inventory_stock_records`).catch(() => {});
    await query(`DROP INDEX idx_inv_variant_id ON inventory_stock_records`).catch(() => {});
    await query(`DROP INDEX idx_inv_product_id ON inventory_stock_records`).catch(() => {});

    await query(`ALTER TABLE inventory_stock_records DROP COLUMN created_by_type`).catch(() => {});
    await query(`ALTER TABLE inventory_stock_records DROP COLUMN cost_price`).catch(() => {});
    await query(`ALTER TABLE inventory_stock_records DROP COLUMN remark`).catch(() => {});
    await query(`ALTER TABLE inventory_stock_records DROP COLUMN source_no`).catch(() => {});
    await query(`ALTER TABLE inventory_stock_records DROP COLUMN order_no_snapshot`).catch(() => {});
    await query(`ALTER TABLE inventory_stock_records DROP COLUMN sku_code_snapshot`).catch(() => {});
    await query(`ALTER TABLE inventory_stock_records DROP COLUMN variant_name_snapshot`).catch(() => {});
    await query(`ALTER TABLE inventory_stock_records DROP COLUMN product_name_snapshot`).catch(() => {});

    await query(`ALTER TABLE product_variants DROP COLUMN deleted_at`).catch(() => {});
    await query(`ALTER TABLE product_variants DROP COLUMN barcode`).catch(() => {});
    await query(`ALTER TABLE product_variants DROP COLUMN cost_price`).catch(() => {});
    await query(`ALTER TABLE product_variants DROP COLUMN reserved_stock`).catch(() => {});
    await query(`ALTER TABLE product_variants DROP COLUMN stock_warning_threshold`).catch(() => {});
  },
};


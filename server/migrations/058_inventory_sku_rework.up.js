module.exports = {
  async up(query) {
    await query(`ALTER TABLE product_variants ADD COLUMN stock_warning_threshold INT NOT NULL DEFAULT 5 AFTER stock`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE product_variants ADD COLUMN reserved_stock INT NOT NULL DEFAULT 0 AFTER stock_warning_threshold`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE product_variants ADD COLUMN cost_price DECIMAL(10,2) NULL AFTER reserved_stock`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE product_variants ADD COLUMN barcode VARCHAR(64) NULL AFTER cost_price`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE product_variants ADD COLUMN deleted_at DATETIME NULL AFTER barcode`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });

    await query(`ALTER TABLE inventory_stock_records ADD COLUMN product_name_snapshot VARCHAR(255) NOT NULL DEFAULT '' AFTER operator_id`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE inventory_stock_records ADD COLUMN variant_name_snapshot VARCHAR(255) NOT NULL DEFAULT '' AFTER product_name_snapshot`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE inventory_stock_records ADD COLUMN sku_code_snapshot VARCHAR(64) NOT NULL DEFAULT '' AFTER variant_name_snapshot`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE inventory_stock_records ADD COLUMN order_no_snapshot VARCHAR(64) NOT NULL DEFAULT '' AFTER sku_code_snapshot`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE inventory_stock_records ADD COLUMN source_no VARCHAR(64) NOT NULL DEFAULT '' AFTER order_no_snapshot`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE inventory_stock_records ADD COLUMN remark VARCHAR(255) NOT NULL DEFAULT '' AFTER source_no`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE inventory_stock_records ADD COLUMN cost_price DECIMAL(10,2) NULL AFTER remark`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });
    await query(`ALTER TABLE inventory_stock_records ADD COLUMN created_by_type VARCHAR(32) NOT NULL DEFAULT 'admin' AFTER cost_price`).catch((e) => { if (e.code !== 'ER_DUP_FIELDNAME') throw e; });

    await query(`CREATE INDEX idx_inv_product_id ON inventory_stock_records(product_id)`).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
    await query(`CREATE INDEX idx_inv_variant_id ON inventory_stock_records(variant_id)`).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
    await query(`CREATE INDEX idx_inv_change_type ON inventory_stock_records(change_type)`).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
    await query(`CREATE INDEX idx_inv_created_at ON inventory_stock_records(created_at)`).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
    await query(`CREATE INDEX idx_inv_operator_id ON inventory_stock_records(operator_id)`).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });

    await query(`CREATE INDEX idx_variant_sku_code ON product_variants(sku_code)`).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
    await query(`CREATE INDEX idx_variant_product_id ON product_variants(product_id)`).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
    await query(`CREATE INDEX idx_variant_deleted_at ON product_variants(deleted_at)`).catch((e) => { if (e.code !== 'ER_DUP_KEYNAME') throw e; });
  },
};


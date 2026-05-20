module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE product_variants
      ADD COLUMN unit_name VARCHAR(32) NOT NULL DEFAULT '件'
        COMMENT '库存单位'
        AFTER stock_warning_threshold
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      UPDATE product_variants
         SET unit_name = '件'
       WHERE unit_name IS NULL OR unit_name = ''
    `).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_pack_rules (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        parent_product_id VARCHAR(36) NOT NULL,
        parent_variant_id VARCHAR(36) NOT NULL,
        child_product_id VARCHAR(36) NOT NULL,
        child_variant_id VARCHAR(36) NOT NULL,
        parent_qty INT NOT NULL DEFAULT 1,
        child_qty INT NOT NULL,
        auto_unpack_enabled TINYINT(1) NOT NULL DEFAULT 0,
        manual_unpack_enabled TINYINT(1) NOT NULL DEFAULT 1,
        manual_assemble_enabled TINYINT(1) NOT NULL DEFAULT 1,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        remark VARCHAR(255) NOT NULL DEFAULT '',
        created_by VARCHAR(36) DEFAULT NULL,
        updated_by VARCHAR(36) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at DATETIME DEFAULT NULL,
        KEY idx_pack_parent (parent_variant_id),
        KEY idx_pack_child (child_variant_id),
        KEY idx_pack_enabled_child (child_variant_id, enabled, auto_unpack_enabled, deleted_at),
        KEY idx_pack_deleted (deleted_at),
        CONSTRAINT fk_pack_parent_product FOREIGN KEY (parent_product_id) REFERENCES products(id),
        CONSTRAINT fk_pack_parent_variant FOREIGN KEY (parent_variant_id) REFERENCES product_variants(id),
        CONSTRAINT fk_pack_child_product FOREIGN KEY (child_product_id) REFERENCES products(id),
        CONSTRAINT fk_pack_child_variant FOREIGN KEY (child_variant_id) REFERENCES product_variants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_conversion_orders (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        order_no VARCHAR(64) NOT NULL,
        type VARCHAR(32) NOT NULL,
        rule_id VARCHAR(36) NOT NULL,
        parent_product_id VARCHAR(36) NOT NULL,
        parent_variant_id VARCHAR(36) NOT NULL,
        parent_qty INT NOT NULL,
        child_product_id VARCHAR(36) NOT NULL,
        child_variant_id VARCHAR(36) NOT NULL,
        rule_parent_qty INT NOT NULL DEFAULT 1,
        child_qty_per_parent INT NOT NULL,
        child_total_qty INT NOT NULL,
        parent_before_stock INT NOT NULL,
        parent_after_stock INT NOT NULL,
        child_before_stock INT NOT NULL,
        child_after_stock INT NOT NULL,
        parent_product_name_snapshot VARCHAR(255) NOT NULL DEFAULT '',
        parent_variant_name_snapshot VARCHAR(255) NOT NULL DEFAULT '',
        parent_sku_code_snapshot VARCHAR(64) NOT NULL DEFAULT '',
        parent_unit_name_snapshot VARCHAR(32) NOT NULL DEFAULT '件',
        child_product_name_snapshot VARCHAR(255) NOT NULL DEFAULT '',
        child_variant_name_snapshot VARCHAR(255) NOT NULL DEFAULT '',
        child_sku_code_snapshot VARCHAR(64) NOT NULL DEFAULT '',
        child_unit_name_snapshot VARCHAR(32) NOT NULL DEFAULT '件',
        source_type VARCHAR(32) NOT NULL DEFAULT 'manual',
        source_order_id VARCHAR(36) DEFAULT NULL,
        source_order_no VARCHAR(64) NOT NULL DEFAULT '',
        operator_id VARCHAR(36) DEFAULT NULL,
        remark VARCHAR(255) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_conv_order_no (order_no),
        KEY idx_conv_type_created (type, created_at),
        KEY idx_conv_rule (rule_id),
        KEY idx_conv_parent (parent_variant_id, created_at),
        KEY idx_conv_child (child_variant_id, created_at),
        KEY idx_conv_source_order (source_order_id),
        CONSTRAINT fk_conv_rule FOREIGN KEY (rule_id) REFERENCES inventory_pack_rules(id),
        CONSTRAINT fk_conv_parent_product FOREIGN KEY (parent_product_id) REFERENCES products(id),
        CONSTRAINT fk_conv_parent_variant FOREIGN KEY (parent_variant_id) REFERENCES product_variants(id),
        CONSTRAINT fk_conv_child_product FOREIGN KEY (child_product_id) REFERENCES products(id),
        CONSTRAINT fk_conv_child_variant FOREIGN KEY (child_variant_id) REFERENCES product_variants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};

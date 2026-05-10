module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE products
      ADD COLUMN stock_warning_threshold INT NOT NULL DEFAULT 5
        COMMENT '库存预警阈值'
        AFTER stock
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      ALTER TABLE product_variants
      ADD COLUMN stock_warning_threshold INT NOT NULL DEFAULT 5
        COMMENT 'SKU库存预警阈值'
        AFTER stock
    `).catch((e) => {
      if (e.code !== 'ER_DUP_FIELDNAME') throw e;
    });

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_stock_records (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) DEFAULT NULL,
        change_type VARCHAR(32) NOT NULL COMMENT 'in/out/adjust/order_deduct/order_release',
        quantity_delta INT NOT NULL COMMENT '库存变化量，入库为正，出库/扣减为负',
        before_stock INT NOT NULL,
        after_stock INT NOT NULL,
        reason VARCHAR(255) NOT NULL DEFAULT '',
        ref_type VARCHAR(32) NOT NULL DEFAULT '',
        ref_id VARCHAR(64) NOT NULL DEFAULT '',
        operator_id VARCHAR(36) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_inv_product_created (product_id, created_at),
        KEY idx_inv_variant_created (variant_id, created_at),
        KEY idx_inv_type_created (change_type, created_at),
        KEY idx_inv_operator_created (operator_id, created_at),
        CONSTRAINT fk_inv_product FOREIGN KEY (product_id) REFERENCES products(id),
        CONSTRAINT fk_inv_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT INTO permissions (code, name, sort_order)
      VALUES ('inventory.manage', '库存管理', 112)
      ON DUPLICATE KEY UPDATE name = VALUES(name)
    `).catch(() => {});

    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.code = 'inventory.manage'
      WHERE r.code IN ('admin_manager', 'operator', 'warehouse')
    `).catch(() => {});
  },
};

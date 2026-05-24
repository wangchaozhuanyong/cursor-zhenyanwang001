module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS purchase_orders (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        order_no VARCHAR(64) NOT NULL UNIQUE,
        supplier_id VARCHAR(36) DEFAULT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        expected_arrival_date DATE DEFAULT NULL,
        actual_arrival_date DATE DEFAULT NULL,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        remark TEXT DEFAULT NULL,
        created_by VARCHAR(36) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_purchase_status (status, expected_arrival_date),
        KEY idx_purchase_supplier (supplier_id),
        KEY idx_purchase_created (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS purchase_order_items (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        purchase_order_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) NOT NULL,
        ordered_qty INT NOT NULL,
        received_qty INT NOT NULL DEFAULT 0,
        unit_cost DECIMAL(12,4) DEFAULT NULL,
        batch_no VARCHAR(100) DEFAULT NULL,
        production_date DATE DEFAULT NULL,
        shelf_life_days INT DEFAULT NULL,
        expiry_date DATE DEFAULT NULL,
        supplier_sku VARCHAR(100) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_poi_order (purchase_order_id),
        KEY idx_poi_variant (variant_id),
        KEY idx_poi_variant_open (variant_id, ordered_qty, received_qty),
        CONSTRAINT fk_poi_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id),
        CONSTRAINT fk_poi_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS inventory_replenishment_alerts (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        variant_id VARCHAR(36) NOT NULL,
        alert_status VARCHAR(32) NOT NULL DEFAULT 'pending',
        current_stock INT NOT NULL DEFAULT 0,
        available_stock INT NOT NULL DEFAULT 0,
        warning_stock INT NOT NULL DEFAULT 0,
        suggested_qty INT NOT NULL DEFAULT 0,
        ordered_qty INT NOT NULL DEFAULT 0,
        received_qty INT NOT NULL DEFAULT 0,
        in_transit_qty INT NOT NULL DEFAULT 0,
        purchase_order_id VARCHAR(36) DEFAULT NULL,
        expected_arrival_date DATE DEFAULT NULL,
        last_alert_at DATETIME DEFAULT NULL,
        snoozed_until DATETIME DEFAULT NULL,
        reason VARCHAR(255) DEFAULT NULL,
        remark TEXT DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_replenishment_variant_status (variant_id, alert_status),
        KEY idx_replenishment_status_updated (alert_status, updated_at),
        KEY idx_replenishment_expected_arrival (expected_arrival_date),
        CONSTRAINT fk_replenishment_variant FOREIGN KEY (variant_id) REFERENCES product_variants(id),
        CONSTRAINT fk_replenishment_purchase_order FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};

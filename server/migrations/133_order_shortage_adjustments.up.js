async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function addColumn(query, table, column, sql) {
  if (!(await hasColumn(query, table, column))) await query(sql);
}

async function addIndex(query, sql) {
  await query(sql).catch((e) => {
    if (e.code !== 'ER_DUP_KEYNAME') throw e;
  });
}

module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS order_adjustments (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        order_no VARCHAR(64) NOT NULL DEFAULT '',
        adjustment_no VARCHAR(64) NOT NULL,
        adjustment_type VARCHAR(32) NOT NULL DEFAULT 'stock_shortage',
        reason VARCHAR(500) NOT NULL DEFAULT '',
        customer_confirmed TINYINT(1) NOT NULL DEFAULT 0,
        customer_confirm_method VARCHAR(64) NOT NULL DEFAULT '',
        customer_confirm_note VARCHAR(500) NOT NULL DEFAULT '',
        before_amount JSON NULL,
        after_amount JSON NULL,
        refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        stock_handling VARCHAR(32) NOT NULL DEFAULT 'no_restore',
        status VARCHAR(32) NOT NULL DEFAULT 'applied',
        operator_id VARCHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY uk_order_adjustments_no (adjustment_no),
        KEY idx_order_adjustments_order_created (order_id, created_at),
        KEY idx_order_adjustments_type_created (adjustment_type, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS order_adjustment_items (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        adjustment_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        order_item_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) NULL,
        sku_code VARCHAR(128) NOT NULL DEFAULT '',
        product_name_snapshot VARCHAR(255) NOT NULL DEFAULT '',
        variant_name_snapshot VARCHAR(255) NOT NULL DEFAULT '',
        before_qty INT NOT NULL,
        after_qty INT NOT NULL,
        removed_qty INT NOT NULL,
        unit_price DECIMAL(12,2) NOT NULL DEFAULT 0,
        line_refund_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        shortage_reason VARCHAR(255) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_order_adjustment_items_adjustment (adjustment_id),
        KEY idx_order_adjustment_items_order (order_id),
        KEY idx_order_adjustment_items_order_item (order_item_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await addColumn(query, 'order_items', 'line_status',
      "ALTER TABLE order_items ADD COLUMN line_status VARCHAR(32) NOT NULL DEFAULT 'active' AFTER qty");
    await addColumn(query, 'order_items', 'original_qty',
      'ALTER TABLE order_items ADD COLUMN original_qty INT NULL AFTER line_status');
    await addColumn(query, 'order_items', 'adjusted_at',
      'ALTER TABLE order_items ADD COLUMN adjusted_at DATETIME NULL AFTER original_qty');
    await addColumn(query, 'order_items', 'adjusted_by',
      'ALTER TABLE order_items ADD COLUMN adjusted_by VARCHAR(36) NULL AFTER adjusted_at');
    await addColumn(query, 'order_items', 'adjusted_reason',
      "ALTER TABLE order_items ADD COLUMN adjusted_reason VARCHAR(255) NOT NULL DEFAULT '' AFTER adjusted_by");

    await addIndex(query, 'CREATE INDEX idx_order_items_order_line_status ON order_items (order_id, line_status)');
  },
};

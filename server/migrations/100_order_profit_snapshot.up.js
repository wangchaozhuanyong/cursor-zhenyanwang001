async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function addColumn(query, table, column, sql) {
  if (!(await hasColumn(query, table, column))) await query(sql);
}

module.exports = {
  async up(query) {
    await addColumn(query, 'order_items', 'unit_cost_price',
      'ALTER TABLE order_items ADD COLUMN unit_cost_price DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER price');
    await addColumn(query, 'order_items', 'cost_amount',
      'ALTER TABLE order_items ADD COLUMN cost_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER unit_cost_price');
    await addColumn(query, 'order_items', 'discount_allocated',
      'ALTER TABLE order_items ADD COLUMN discount_allocated DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER cost_amount');
    await addColumn(query, 'order_items', 'net_sales_amount',
      'ALTER TABLE order_items ADD COLUMN net_sales_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER discount_allocated');
    await addColumn(query, 'order_items', 'gross_profit_amount',
      'ALTER TABLE order_items ADD COLUMN gross_profit_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER net_sales_amount');
    await addColumn(query, 'order_items', 'cost_snapshot_source',
      "ALTER TABLE order_items ADD COLUMN cost_snapshot_source VARCHAR(32) NOT NULL DEFAULT 'missing' AFTER gross_profit_amount");

    await addColumn(query, 'orders', 'goods_cost_amount',
      'ALTER TABLE orders ADD COLUMN goods_cost_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER total_amount');
    await addColumn(query, 'orders', 'goods_net_sales_amount',
      'ALTER TABLE orders ADD COLUMN goods_net_sales_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER goods_cost_amount');
    await addColumn(query, 'orders', 'gross_profit_amount',
      'ALTER TABLE orders ADD COLUMN gross_profit_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER goods_net_sales_amount');
    await addColumn(query, 'orders', 'shipping_cost_amount',
      'ALTER TABLE orders ADD COLUMN shipping_cost_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER shipping_fee');
    await addColumn(query, 'orders', 'payment_fee_amount',
      'ALTER TABLE orders ADD COLUMN payment_fee_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER shipping_cost_amount');
    await addColumn(query, 'orders', 'net_profit_amount',
      'ALTER TABLE orders ADD COLUMN net_profit_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER payment_fee_amount');

    await query(`
      CREATE TABLE IF NOT EXISTS operating_expense_records (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        expense_date DATE NOT NULL,
        category VARCHAR(64) NOT NULL DEFAULT 'other',
        amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        title VARCHAR(255) NOT NULL DEFAULT '',
        remark VARCHAR(500) NOT NULL DEFAULT '',
        operator_id VARCHAR(36) NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_expense_date (expense_date),
        KEY idx_expense_category (category)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query('CREATE INDEX idx_order_items_profit_order ON order_items (order_id, cost_snapshot_source)').catch((e) => {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    });
    await query('CREATE INDEX idx_orders_profit_date ON orders (created_at, payment_status)').catch((e) => {
      if (e.code !== 'ER_DUP_KEYNAME') throw e;
    });
  },
};

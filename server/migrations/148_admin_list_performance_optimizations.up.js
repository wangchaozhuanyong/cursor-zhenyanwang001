async function addIndex(query, sql) {
  await query(sql).catch((error) => {
    if (error.code !== 'ER_DUP_KEYNAME') throw error;
  });
}

module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS product_sales_metrics_cache (
        product_id VARCHAR(36) NOT NULL PRIMARY KEY,
        sales_qty_7d INT NOT NULL DEFAULT 0,
        sales_qty_30d INT NOT NULL DEFAULT 0,
        sales_amount_30d DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        gross_profit_30d DECIMAL(14,2) NOT NULL DEFAULT 0.00,
        computed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_product_sales_metrics_computed_at (computed_at),
        CONSTRAINT fk_product_sales_metrics_product
          FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await addIndex(query, 'CREATE INDEX idx_products_admin_list ON products (deleted_at, lifecycle_status, status, created_at)');
    await addIndex(query, 'CREATE INDEX idx_product_variants_admin_product ON product_variants (product_id, deleted_at, enabled, stock, cost_price)');
    await addIndex(query, 'CREATE INDEX idx_order_items_product_order_status ON order_items (product_id, order_id, line_status)');
    await addIndex(query, 'CREATE INDEX idx_orders_admin_status_payment_created ON orders (status, payment_status, created_at)');
    await addIndex(query, 'CREATE INDEX idx_orders_admin_payment_dates ON orders (payment_status, paid_at, payment_time, created_at)');
    await addIndex(query, 'CREATE INDEX idx_return_requests_order_status ON return_requests (order_id, status)');
    await addIndex(query, 'CREATE INDEX idx_users_admin_created ON users (deleted_at, created_at)');
  },
};

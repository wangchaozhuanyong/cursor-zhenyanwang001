async function dropIndex(query, table, indexName) {
  await query(`ALTER TABLE ${table} DROP INDEX ${indexName}`).catch((error) => {
    if (error.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw error;
  });
}

module.exports = {
  async down(query) {
    await dropIndex(query, 'users', 'idx_users_admin_created');
    await dropIndex(query, 'return_requests', 'idx_return_requests_order_status');
    await dropIndex(query, 'orders', 'idx_orders_admin_payment_dates');
    await dropIndex(query, 'orders', 'idx_orders_admin_status_payment_created');
    await dropIndex(query, 'order_items', 'idx_order_items_product_order_status');
    await dropIndex(query, 'product_variants', 'idx_product_variants_admin_product');
    await dropIndex(query, 'products', 'idx_products_admin_list');
    await query('DROP TABLE IF EXISTS product_sales_metrics_cache');
  },
};

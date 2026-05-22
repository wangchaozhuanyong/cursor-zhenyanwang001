async function hasColumn(query, table, column) {
  const [rows] = await query(`SHOW COLUMNS FROM ${table} LIKE ?`, [column]);
  return rows.length > 0;
}

async function addColumn(query, table, column, sql) {
  if (!(await hasColumn(query, table, column))) await query(sql);
}

module.exports = {
  async up(query) {
    await addColumn(query, 'users', 'birthday',
      'ALTER TABLE users ADD COLUMN birthday DATE NULL DEFAULT NULL AFTER whatsapp');
    await addColumn(query, 'users', 'birthday_updated_at',
      'ALTER TABLE users ADD COLUMN birthday_updated_at DATETIME NULL DEFAULT NULL AFTER birthday');
    await addColumn(query, 'users', 'birthday_locked',
      'ALTER TABLE users ADD COLUMN birthday_locked TINYINT(1) NOT NULL DEFAULT 0 AFTER birthday_updated_at');

    await addColumn(query, 'orders', 'order_type',
      "ALTER TABLE orders ADD COLUMN order_type VARCHAR(32) NOT NULL DEFAULT 'normal' AFTER order_no");

    await query(`
      CREATE TABLE IF NOT EXISTS points_gift_items (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        product_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) NULL,
        title VARCHAR(200) NOT NULL DEFAULT '',
        image VARCHAR(512) NOT NULL DEFAULT '',
        required_points INT NOT NULL DEFAULT 0,
        cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        stock_limit INT NOT NULL DEFAULT 0,
        redeemed_count INT NOT NULL DEFAULT 0,
        limit_per_user INT NOT NULL DEFAULT 0,
        start_at DATETIME NULL,
        end_at DATETIME NULL,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_points_gift_items_enabled (enabled, start_at, end_at),
        INDEX idx_points_gift_items_product (product_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS points_gift_redemptions (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        gift_item_id VARCHAR(36) NOT NULL,
        order_id VARCHAR(36) NOT NULL,
        order_no VARCHAR(64) NOT NULL DEFAULT '',
        product_id VARCHAR(36) NOT NULL,
        variant_id VARCHAR(36) NULL,
        quantity INT NOT NULL DEFAULT 1,
        points_used INT NOT NULL DEFAULT 0,
        cash_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        address_snapshot JSON NULL,
        metadata JSON NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_points_gift_redemptions_user (user_id, gift_item_id),
        INDEX idx_points_gift_redemptions_order (order_id),
        INDEX idx_points_gift_redemptions_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
  },
};

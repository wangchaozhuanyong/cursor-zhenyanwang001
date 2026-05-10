module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS marketing_activities (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        type ENUM('flash_sale','full_reduction') NOT NULL DEFAULT 'flash_sale',
        title VARCHAR(120) NOT NULL,
        description VARCHAR(500) NOT NULL DEFAULT '',
        start_at DATETIME NOT NULL,
        end_at DATETIME NOT NULL,
        disabled TINYINT(1) NOT NULL DEFAULT 0,
        threshold_amount DECIMAL(10,2) DEFAULT NULL,
        discount_amount DECIMAL(10,2) DEFAULT NULL,
        sort_order INT NOT NULL DEFAULT 0,
        created_by VARCHAR(36) DEFAULT NULL,
        updated_by VARCHAR(36) DEFAULT NULL,
        deleted_at DATETIME DEFAULT NULL,
        deleted_by VARCHAR(36) DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_ma_time_status (disabled, start_at, end_at),
        KEY idx_ma_type (type),
        KEY idx_ma_deleted (deleted_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS marketing_activity_products (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        activity_id VARCHAR(36) NOT NULL,
        product_id VARCHAR(36) NOT NULL,
        activity_price DECIMAL(10,2) NOT NULL DEFAULT 0,
        limit_per_user INT NOT NULL DEFAULT 0,
        activity_stock INT NOT NULL DEFAULT 0,
        sold_count INT NOT NULL DEFAULT 0,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_map_activity_product (activity_id, product_id),
        KEY idx_map_product (product_id),
        KEY idx_map_activity (activity_id),
        CONSTRAINT fk_map_activity FOREIGN KEY (activity_id) REFERENCES marketing_activities(id) ON DELETE CASCADE,
        CONSTRAINT fk_map_product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(
      `INSERT IGNORE INTO permissions (code, name, sort_order) VALUES ('activity.manage', '活动管理', 18)`,
    ).catch((e) => {
      if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
    });

    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.code = 'activity.manage'
      WHERE r.code IN ('super_admin', 'admin_manager', 'operator')
    `).catch((e) => {
      if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
    });
  },
};

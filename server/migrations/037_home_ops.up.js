module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS home_nav_items (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        icon_url VARCHAR(512) NOT NULL DEFAULT '' COMMENT '图标URL或简短图标文本',
        title VARCHAR(64) NOT NULL,
        link_url VARCHAR(512) NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_home_nav_enabled_sort (enabled, sort_order, created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS home_announcements (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        title VARCHAR(120) NOT NULL DEFAULT '',
        content VARCHAR(500) NOT NULL DEFAULT '',
        link_url VARCHAR(512) NOT NULL DEFAULT '',
        sort_order INT NOT NULL DEFAULT 0,
        enabled TINYINT(1) NOT NULL DEFAULT 1,
        start_at DATETIME DEFAULT NULL,
        end_at DATETIME DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        KEY idx_home_ann_enabled_window_sort (enabled, start_at, end_at, sort_order)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      INSERT INTO permissions (code, name, sort_order)
      VALUES ('home_ops.manage', '首页运营配置', 281)
      ON DUPLICATE KEY UPDATE name = VALUES(name), sort_order = VALUES(sort_order)
    `).catch(() => {});

    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT r.id, p.id
      FROM roles r
      JOIN permissions p ON p.code = 'home_ops.manage'
      WHERE r.code IN ('admin_manager', 'operator')
    `).catch(() => {});
  },
};

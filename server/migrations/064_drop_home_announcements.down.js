module.exports = {
  async up(query) {
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
  },
};

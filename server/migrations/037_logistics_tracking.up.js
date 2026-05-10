module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS logistics_tracks (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        order_id VARCHAR(36) NOT NULL,
        tracking_no VARCHAR(80) NOT NULL DEFAULT '',
        carrier VARCHAR(80) NOT NULL DEFAULT '',
        carrier_code VARCHAR(40) NOT NULL DEFAULT '',
        status VARCHAR(32) NOT NULL DEFAULT 'info',
        title VARCHAR(120) NOT NULL DEFAULT '',
        description VARCHAR(255) NOT NULL DEFAULT '',
        location VARCHAR(120) NOT NULL DEFAULT '',
        event_time DATETIME NOT NULL,
        source VARCHAR(32) NOT NULL DEFAULT 'adapter',
        raw_data JSON DEFAULT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uniq_logistics_event (order_id, tracking_no, carrier_code, status, event_time),
        KEY idx_logistics_order_time (order_id, event_time),
        KEY idx_logistics_tracking (tracking_no, carrier_code),
        CONSTRAINT fk_logistics_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};

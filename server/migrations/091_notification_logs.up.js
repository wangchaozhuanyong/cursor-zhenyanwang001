module.exports = {
  async up(query) {
    await query(`
      CREATE TABLE IF NOT EXISTS notification_logs (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        channel VARCHAR(32) NOT NULL DEFAULT '',
        target_type VARCHAR(32) NOT NULL DEFAULT '',
        target_id VARCHAR(128) NOT NULL DEFAULT '',
        order_id VARCHAR(36) NULL,
        event_type VARCHAR(64) NOT NULL DEFAULT '',
        message_content MEDIUMTEXT NULL,
        send_status VARCHAR(24) NOT NULL DEFAULT 'pending',
        provider_message_id VARCHAR(255) NOT NULL DEFAULT '',
        error_message VARCHAR(1000) NOT NULL DEFAULT '',
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_notification_logs_order_event (channel, order_id, event_type),
        INDEX idx_notification_logs_status_time (channel, send_status, created_at),
        INDEX idx_notification_logs_created_at (created_at)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
  },
};

module.exports = {
  async up(query) {
    await query(`CREATE TABLE IF NOT EXISTS user_feedback (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      user_id VARCHAR(36) DEFAULT NULL,
      type VARCHAR(32) NOT NULL DEFAULT 'other',
      title VARCHAR(120) NOT NULL DEFAULT '',
      content TEXT NOT NULL,
      contact VARCHAR(120) NOT NULL DEFAULT '',
      order_no VARCHAR(64) NOT NULL DEFAULT '',
      page_url VARCHAR(500) NOT NULL DEFAULT '',
      status VARCHAR(32) NOT NULL DEFAULT 'pending',
      handler_note TEXT DEFAULT NULL,
      handled_by VARCHAR(36) DEFAULT NULL,
      handled_at DATETIME DEFAULT NULL,
      source_ip VARCHAR(45) NOT NULL DEFAULT '',
      user_agent VARCHAR(500) NOT NULL DEFAULT '',
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_user_feedback_status_created (status, created_at),
      INDEX idx_user_feedback_user_created (user_id, created_at),
      INDEX idx_user_feedback_type_created (type, created_at),
      CONSTRAINT fk_user_feedback_user
        FOREIGN KEY (user_id) REFERENCES users(id)
        ON DELETE SET NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  },
};

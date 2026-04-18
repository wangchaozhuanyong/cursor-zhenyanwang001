module.exports = {
  async up(query) {
    await query(`CREATE TABLE IF NOT EXISTS export_tasks (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      file_name VARCHAR(255) NOT NULL,
      type VARCHAR(50) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'pending',
      file_path VARCHAR(500) DEFAULT NULL,
      file_size INT DEFAULT 0,
      error_message VARCHAR(500) DEFAULT NULL,
      created_by VARCHAR(36) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      finished_at DATETIME DEFAULT NULL,
      INDEX idx_export_created_by (created_by),
      INDEX idx_export_status (status)
    ) ENGINE=InnoDB`);
  },
};

async function columnExists(query, table, column) {
  const [rows] = await query(
    `SELECT COUNT(*) AS total
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = ?
        AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(rows?.[0]?.total || 0) > 0;
}

async function addColumnIfMissing(query, table, column, sql) {
  if (await columnExists(query, table, column)) return;
  await query(sql);
}

module.exports = {
  async up(query) {
    await addColumnIfMissing(
      query,
      'return_requests',
      'refund_amount',
      'ALTER TABLE return_requests ADD COLUMN refund_amount DECIMAL(12,2) NULL DEFAULT NULL AFTER status',
    );
    await addColumnIfMissing(
      query,
      'return_requests',
      'admin_remark',
      'ALTER TABLE return_requests ADD COLUMN admin_remark TEXT NULL AFTER refund_amount',
    );
    await addColumnIfMissing(
      query,
      'return_requests',
      'contact_phone',
      "ALTER TABLE return_requests ADD COLUMN contact_phone VARCHAR(32) NOT NULL DEFAULT '' AFTER admin_remark",
    );
    await addColumnIfMissing(
      query,
      'return_requests',
      'updated_at',
      'ALTER TABLE return_requests ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER created_at',
    );

    await query(`CREATE TABLE IF NOT EXISTS return_events (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      return_id VARCHAR(36) NOT NULL,
      user_id VARCHAR(36) DEFAULT NULL,
      actor_type VARCHAR(20) NOT NULL DEFAULT 'system',
      actor_id VARCHAR(36) DEFAULT NULL,
      event_type VARCHAR(50) NOT NULL DEFAULT 'note',
      from_status VARCHAR(32) DEFAULT NULL,
      to_status VARCHAR(32) DEFAULT NULL,
      title VARCHAR(120) NOT NULL DEFAULT '',
      note TEXT DEFAULT NULL,
      payload JSON DEFAULT NULL,
      visible_to_user TINYINT(1) NOT NULL DEFAULT 1,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_return_events_return_created (return_id, created_at),
      INDEX idx_return_events_user_created (user_id, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    await query(`CREATE TABLE IF NOT EXISTS return_shipments (
      id VARCHAR(36) NOT NULL PRIMARY KEY,
      return_id VARCHAR(36) NOT NULL,
      direction VARCHAR(32) NOT NULL DEFAULT 'buyer_return',
      carrier VARCHAR(80) NOT NULL DEFAULT '',
      tracking_no VARCHAR(120) NOT NULL DEFAULT '',
      contact_phone VARCHAR(32) NOT NULL DEFAULT '',
      note TEXT DEFAULT NULL,
      created_by_type VARCHAR(20) NOT NULL DEFAULT 'user',
      created_by VARCHAR(36) DEFAULT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_return_shipments_return_created (return_id, created_at),
      INDEX idx_return_shipments_tracking (tracking_no)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);
  },
};

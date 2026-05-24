async function addColumn(query, table, column, definition) {
  await query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`).catch(() => {});
}

async function addIndex(query, table, indexSql) {
  await query(`ALTER TABLE ${table} ADD ${indexSql}`).catch(() => {});
}

module.exports = {
  async up(query) {
    await addColumn(query, 'coupons', 'publish_status', "VARCHAR(30) NOT NULL DEFAULT 'active' AFTER status");
    await addColumn(query, 'coupons', 'claim_start_at', 'DATETIME NULL AFTER publish_status');
    await addColumn(query, 'coupons', 'claim_end_at', 'DATETIME NULL AFTER claim_start_at');
    await addColumn(query, 'coupons', 'use_start_at', 'DATETIME NULL AFTER claim_end_at');
    await addColumn(query, 'coupons', 'use_end_at', 'DATETIME NULL AFTER use_start_at');
    await addColumn(query, 'coupons', 'validity_mode', "VARCHAR(30) NOT NULL DEFAULT 'absolute' AFTER use_end_at");
    await addColumn(query, 'coupons', 'valid_days_after_claim', 'INT NULL AFTER validity_mode');
    await addColumn(query, 'coupons', 'follow_activity_id', 'VARCHAR(36) NULL AFTER valid_days_after_claim');
    await addColumn(query, 'coupons', 'claimed_count', 'INT NOT NULL DEFAULT 0 AFTER follow_activity_id');
    await addColumn(query, 'coupons', 'used_count', 'INT NOT NULL DEFAULT 0 AFTER claimed_count');
    await addColumn(query, 'coupons', 'issue_mode', "VARCHAR(30) NOT NULL DEFAULT 'manual' AFTER used_count");
    await addColumn(query, 'coupons', 'stop_claim_at', 'DATETIME NULL AFTER issue_mode');
    await addColumn(query, 'coupons', 'stop_use_at', 'DATETIME NULL AFTER stop_claim_at');
    await addColumn(query, 'coupons', 'archived_at', 'DATETIME NULL AFTER stop_use_at');
    await addColumn(query, 'coupons', 'invalidated_at', 'DATETIME NULL AFTER archived_at');
    await addColumn(query, 'coupons', 'invalid_reason', 'VARCHAR(255) NULL AFTER invalidated_at');

    await addColumn(query, 'user_coupons', 'coupon_snapshot', 'JSON NULL AFTER coupon_id');
    await addColumn(query, 'user_coupons', 'valid_from', 'DATETIME NULL AFTER status');
    await addColumn(query, 'user_coupons', 'valid_until', 'DATETIME NULL AFTER valid_from');
    await addColumn(query, 'user_coupons', 'issue_channel', 'VARCHAR(50) NULL AFTER valid_until');
    await addColumn(query, 'user_coupons', 'issue_activity_id', 'VARCHAR(36) NULL AFTER issue_channel');
    await addColumn(query, 'user_coupons', 'source_admin_id', 'VARCHAR(36) NULL AFTER issue_activity_id');
    await addColumn(query, 'user_coupons', 'order_id', 'VARCHAR(36) NULL AFTER used_at');
    await addColumn(query, 'user_coupons', 'order_no', 'VARCHAR(100) NULL AFTER order_id');
    await addColumn(query, 'user_coupons', 'discount_amount', 'DECIMAL(10,2) NULL AFTER order_no');
    await addColumn(query, 'user_coupons', 'invalid_reason', 'VARCHAR(255) NULL AFTER discount_amount');
    await addColumn(query, 'user_coupons', 'returned_at', 'DATETIME NULL AFTER invalid_reason');
    await addColumn(query, 'user_coupons', 'return_reason', 'VARCHAR(255) NULL AFTER returned_at');
    await addColumn(query, 'user_coupons', 'locked_at', 'DATETIME NULL AFTER return_reason');

    await query(`
      UPDATE coupons
         SET claim_start_at = COALESCE(claim_start_at, CONCAT(start_date, ' 00:00:00')),
             claim_end_at = COALESCE(claim_end_at, CONCAT(end_date, ' 23:59:59')),
             use_start_at = COALESCE(use_start_at, CONCAT(start_date, ' 00:00:00')),
             use_end_at = COALESCE(use_end_at, CONCAT(end_date, ' 23:59:59')),
             publish_status = CASE
               WHEN status = 'available' THEN 'active'
               WHEN status = 'disabled' THEN 'disabled'
               ELSE COALESCE(NULLIF(status, ''), publish_status)
             END
    `).catch(() => {});

    await query(`
      UPDATE user_coupons uc
      JOIN coupons c ON BINARY uc.coupon_id = BINARY c.id
         SET uc.valid_from = COALESCE(uc.valid_from, c.use_start_at, CONCAT(c.start_date, ' 00:00:00')),
             uc.valid_until = COALESCE(uc.valid_until, c.use_end_at, CONCAT(c.end_date, ' 23:59:59'))
    `).catch(() => {});

    await query(`
      UPDATE user_coupons
         SET status = 'expired',
             invalid_reason = COALESCE(invalid_reason, '优惠券已过期')
       WHERE status IN ('available', 'pending')
         AND valid_until IS NOT NULL
         AND valid_until < NOW()
    `).catch(() => {});

    await query(`
      UPDATE coupons c
         SET claimed_count = (
           SELECT COUNT(*) FROM user_coupons uc WHERE BINARY uc.coupon_id = BINARY c.id
         ),
         used_count = (
           SELECT COUNT(*) FROM user_coupons uc WHERE BINARY uc.coupon_id = BINARY c.id AND uc.status = 'used'
         )
    `).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS coupon_events (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        coupon_id VARCHAR(36) NOT NULL,
        user_coupon_id VARCHAR(36) NULL,
        user_id VARCHAR(36) NULL,
        event_type VARCHAR(50) NOT NULL,
        order_id VARCHAR(36) NULL,
        order_no VARCHAR(100) NULL,
        admin_user_id VARCHAR(36) NULL,
        reason VARCHAR(255) NULL,
        metadata JSON NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        KEY idx_coupon_events_coupon (coupon_id),
        KEY idx_coupon_events_user_coupon (user_coupon_id),
        KEY idx_coupon_events_user (user_id),
        KEY idx_coupon_events_type (event_type),
        KEY idx_coupon_events_order (order_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await addIndex(query, 'user_coupons', 'KEY idx_uc_user_status_valid (user_id, status, valid_until)');
    await addIndex(query, 'user_coupons', 'KEY idx_uc_coupon_status (coupon_id, status)');
    await addIndex(query, 'user_coupons', 'KEY idx_uc_order_id (order_id)');
    await addIndex(query, 'coupons', 'KEY idx_coupon_publish_claim (publish_status, claim_start_at, claim_end_at)');
    await addIndex(query, 'coupons', 'KEY idx_coupon_use_end (use_end_at)');
  },
};

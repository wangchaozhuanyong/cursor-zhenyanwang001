module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE marketing_activities
      ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'draft' AFTER end_at,
      ADD COLUMN subtitle VARCHAR(160) NOT NULL DEFAULT '' AFTER title,
      ADD COLUMN cover_image VARCHAR(255) NOT NULL DEFAULT '' AFTER subtitle,
      ADD COLUMN display_positions JSON NULL AFTER cover_image,
      ADD COLUMN scope_type VARCHAR(32) NOT NULL DEFAULT 'product' AFTER description,
      ADD COLUMN allow_coupon_stack TINYINT(1) NOT NULL DEFAULT 1 AFTER scope_type,
      ADD COLUMN allow_points_stack TINYINT(1) NOT NULL DEFAULT 1 AFTER allow_coupon_stack,
      ADD COLUMN allow_reward TINYINT(1) NOT NULL DEFAULT 0 AFTER allow_points_stack,
      ADD COLUMN publish_at DATETIME NULL AFTER allow_reward,
      ADD COLUMN internal_note VARCHAR(255) NOT NULL DEFAULT '' AFTER publish_at,
      ADD COLUMN activity_config JSON NULL AFTER internal_note,
      ADD KEY idx_ma_status (status),
      ADD KEY idx_ma_scope_type (scope_type),
      ADD KEY idx_ma_publish_at (publish_at)
    `).catch(() => {});

    await query(`
      CREATE TABLE IF NOT EXISTS marketing_activity_scopes (
        id VARCHAR(36) NOT NULL PRIMARY KEY,
        activity_id VARCHAR(36) NOT NULL,
        scope_type VARCHAR(32) NOT NULL,
        scope_id VARCHAR(64) NOT NULL,
        created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        KEY idx_mas_activity (activity_id),
        KEY idx_mas_scope (scope_type, scope_id),
        CONSTRAINT fk_mas_activity FOREIGN KEY (activity_id) REFERENCES marketing_activities(id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);

    await query(`
      ALTER TABLE coupons
      ADD COLUMN total_quantity INT NOT NULL DEFAULT 0 AFTER display_badge,
      ADD COLUMN per_user_limit INT NOT NULL DEFAULT 1 AFTER total_quantity,
      ADD COLUMN new_user_only TINYINT(1) NOT NULL DEFAULT 0 AFTER per_user_limit,
      ADD COLUMN member_only TINYINT(1) NOT NULL DEFAULT 0 AFTER new_user_only,
      ADD COLUMN auto_issue TINYINT(1) NOT NULL DEFAULT 0 AFTER member_only,
      ADD COLUMN usable_scope_type VARCHAR(20) NOT NULL DEFAULT 'all' AFTER auto_issue,
      ADD COLUMN usable_product_ids JSON NULL AFTER usable_scope_type,
      ADD COLUMN usable_category_ids JSON NULL AFTER usable_product_ids,
      ADD COLUMN stackable_with_activity TINYINT(1) NOT NULL DEFAULT 1 AFTER usable_category_ids,
      ADD KEY idx_coupon_scope_type (usable_scope_type),
      ADD KEY idx_coupon_new_user (new_user_only),
      ADD KEY idx_coupon_member_only (member_only)
    `).catch(() => {});
  },
};


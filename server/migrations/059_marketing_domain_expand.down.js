module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS marketing_activity_scopes').catch(() => {});

    await query(`
      ALTER TABLE marketing_activities
      DROP KEY idx_ma_status,
      DROP KEY idx_ma_scope_type,
      DROP KEY idx_ma_publish_at,
      DROP COLUMN status,
      DROP COLUMN subtitle,
      DROP COLUMN cover_image,
      DROP COLUMN display_positions,
      DROP COLUMN scope_type,
      DROP COLUMN allow_coupon_stack,
      DROP COLUMN allow_points_stack,
      DROP COLUMN allow_reward,
      DROP COLUMN publish_at,
      DROP COLUMN internal_note,
      DROP COLUMN activity_config
    `).catch(() => {});

    await query(`
      ALTER TABLE coupons
      DROP KEY idx_coupon_scope_type,
      DROP KEY idx_coupon_new_user,
      DROP KEY idx_coupon_member_only,
      DROP COLUMN total_quantity,
      DROP COLUMN per_user_limit,
      DROP COLUMN new_user_only,
      DROP COLUMN member_only,
      DROP COLUMN auto_issue,
      DROP COLUMN usable_scope_type,
      DROP COLUMN usable_product_ids,
      DROP COLUMN usable_category_ids,
      DROP COLUMN stackable_with_activity
    `).catch(() => {});
  },
};


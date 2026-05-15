module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE marketing_activities
      MODIFY COLUMN type ENUM('flash_sale','full_reduction','coupon_activity','new_user_gift','member_activity','points_bonus','cashback_activity')
      NOT NULL DEFAULT 'flash_sale'
    `).catch(() => {});
  },
};


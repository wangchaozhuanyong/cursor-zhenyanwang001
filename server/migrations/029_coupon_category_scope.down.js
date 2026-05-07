module.exports = {
  async down(query) {
    await query(`DROP TABLE IF EXISTS coupon_categories`);
    await query(`ALTER TABLE coupons DROP COLUMN display_badge`).catch(() => {});
    await query(`ALTER TABLE coupons DROP COLUMN scope_type`).catch(() => {});
  },
};

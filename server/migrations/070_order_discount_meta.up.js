module.exports = {
  async up(query) {
    await query(`
      ALTER TABLE orders
      ADD COLUMN discount_meta JSON NULL COMMENT '优惠明细：秒杀/满减/优惠券拆分' AFTER discount_amount
    `).catch(() => {});
  },
};

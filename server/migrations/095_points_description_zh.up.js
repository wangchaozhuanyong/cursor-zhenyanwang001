/**
 * 将积分流水历史中英文 description 统一为中文展示文案。
 */
module.exports = {
  async up(query) {
    await query(
      `UPDATE points_records SET description = '每日签到' WHERE description = 'Daily sign-in points'`,
    );
    await query(
      `UPDATE points_records SET description = '订单积分发放' WHERE description = 'Order points earned'`,
    );
    await query(
      `UPDATE points_records SET description = '订单积分回滚' WHERE description = 'Order points reversed'`,
    );
    await query(
      `UPDATE points_records SET description = '后台积分调整' WHERE description = 'Admin points adjustment'`,
    );
    await query(
      `UPDATE points_records
       SET description = CONCAT('未支付超时订单积分回滚（', TRIM(SUBSTRING(description, 43)), '）')
       WHERE description LIKE 'Rollback points for unpaid timeout order %'`,
    );
    await query(
      `UPDATE points_records
       SET description = REPLACE(REPLACE(description, 'Order status changed to ', '订单状态变更为 '), ', rewards reversed', '，奖励已回滚')
       WHERE description LIKE 'Order status changed to %, rewards reversed'`,
    );
  },
};

/** 邀请返现默认改为付款成功后结算，与前台「好友下单」承诺对齐 */
module.exports = {
  async up(query) {
    await query(
      `ALTER TABLE referral_rules
       MODIFY COLUMN settlement_timing VARCHAR(32) NOT NULL DEFAULT 'order_paid'`,
    );
    await query(
      `UPDATE referral_rules
       SET settlement_timing = 'order_paid'
       WHERE settlement_timing IN ('order_completed', 'payment_success', '')`,
    );
  },
};

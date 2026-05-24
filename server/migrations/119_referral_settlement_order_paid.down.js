module.exports = {
  async down(query) {
    await query(
      `ALTER TABLE referral_rules
       MODIFY COLUMN settlement_timing VARCHAR(32) NOT NULL DEFAULT 'order_completed'`,
    );
  },
};

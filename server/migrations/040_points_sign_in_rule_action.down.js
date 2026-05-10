module.exports = {
  async down(query) {
    await query(`UPDATE points_rules SET action = 'daily_checkin' WHERE action = 'sign_in' AND name = '每日签到'`);
  },
};

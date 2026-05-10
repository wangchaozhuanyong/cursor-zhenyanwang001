/**
 * 历史种子将签到规则 action 写成 daily_checkin，与流水 action sign_in 不一致，
 * 导致后台「每日签到」积分配置无法被 selectSignInRule 读取（已兼容双 key，此处再统一库内值）。
 */
module.exports = {
  async up(query) {
    await query(`UPDATE points_rules SET action = 'sign_in' WHERE action = 'daily_checkin'`);
  },
};

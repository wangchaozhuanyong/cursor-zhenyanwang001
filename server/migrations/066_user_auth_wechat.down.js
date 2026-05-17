module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS user_login_audits');
    await query('DROP TABLE IF EXISTS pending_wechat_login');
    await query('DROP TABLE IF EXISTS user_auth_identities');
  },
};

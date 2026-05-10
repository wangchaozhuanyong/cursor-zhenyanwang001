module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS otp_send_logs');
    await query('DROP TABLE IF EXISTS auth_login_tickets');
    await query('DROP TABLE IF EXISTS oauth_states');
    await query('DROP TABLE IF EXISTS oauth_accounts');
  },
};

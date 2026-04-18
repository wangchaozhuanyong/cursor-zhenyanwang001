module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS user_roles');
    await query('DROP TABLE IF EXISTS role_permissions');
    await query('DROP TABLE IF EXISTS roles');
    await query('DROP TABLE IF EXISTS permissions');
  },
};

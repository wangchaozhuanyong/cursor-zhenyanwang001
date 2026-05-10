module.exports = {
  async down(query) {
    await query(`
      DELETE rp FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = 'home_ops.manage'
    `).catch(() => {});
    await query("DELETE FROM permissions WHERE code = 'home_ops.manage'").catch(() => {});
    await query('DROP TABLE IF EXISTS home_announcements');
    await query('DROP TABLE IF EXISTS home_nav_items');
  },
};

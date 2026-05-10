module.exports = {
  async down(query) {
    await query('DROP TABLE IF EXISTS marketing_activity_products');
    await query('DROP TABLE IF EXISTS marketing_activities');
    await query(`
      DELETE rp FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = 'activity.manage'
    `).catch(() => {});
    await query(`DELETE FROM permissions WHERE code = 'activity.manage'`).catch(() => {});
  },
};

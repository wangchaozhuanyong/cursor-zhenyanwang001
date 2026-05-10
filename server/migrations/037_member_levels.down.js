module.exports = {
  async down(query) {
    await query(`
      DELETE rp FROM role_permissions rp
      JOIN permissions p ON p.id = rp.permission_id
      WHERE p.code = 'member_level.manage'
    `).catch(() => {});
    await query("DELETE FROM permissions WHERE code = 'member_level.manage'").catch(() => {});

    await query('ALTER TABLE users DROP KEY idx_users_member_level').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
    await query('ALTER TABLE users DROP COLUMN member_level_id').catch((e) => {
      if (e.code !== 'ER_CANT_DROP_FIELD_OR_KEY') throw e;
    });
    await query('DROP TABLE IF EXISTS member_levels');
  },
};

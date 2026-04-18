module.exports = {
  async down(query) {
    await query(
      `DELETE rp FROM role_permissions rp
       JOIN permissions p ON p.id = rp.permission_id
       WHERE p.code IN ('review.manage', 'recycle_bin.manage')`,
    );
    await query(`DELETE FROM permissions WHERE code IN ('review.manage', 'recycle_bin.manage')`);
  },
};

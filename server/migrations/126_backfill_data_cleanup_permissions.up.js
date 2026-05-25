module.exports = {
  async up(query) {
    await query(`
      INSERT IGNORE INTO permissions (code, name, sort_order) VALUES
      ('data_cleanup.view', '数据清理查看', 200),
      ('data_cleanup.manage', '数据清理策略管理', 201),
      ('data_cleanup.execute', '数据清理执行', 202)
    `);

    for (const roleCode of ['super_admin', 'admin_manager']) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r
         JOIN permissions p ON p.code IN ('data_cleanup.view', 'data_cleanup.manage', 'data_cleanup.execute')
         WHERE r.code = ?`,
        [roleCode],
      );
    }
  },
};

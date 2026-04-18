/**
 * 注册 review.manage / recycle_bin.manage 权限码到 permissions 表
 * 并绑定到 super_admin / admin_manager / operator 角色
 * 同时为已有管理员 last_login_at = NULL 填充 created_at 作为默认值
 */
module.exports = {
  async up(query) {
    await query(
      `INSERT IGNORE INTO permissions (code, name, sort_order) VALUES ('review.manage', '评论管理', 100)`,
    );
    await query(
      `INSERT IGNORE INTO permissions (code, name, sort_order) VALUES ('recycle_bin.manage', '回收站管理', 101)`,
    );

    for (const roleCode of ['super_admin', 'admin_manager']) {
      await query(
        `INSERT IGNORE INTO role_permissions (role_id, permission_id)
         SELECT r.id, p.id
         FROM roles r
         CROSS JOIN permissions p
         WHERE r.code = ? AND p.code IN ('review.manage', 'recycle_bin.manage')`,
        [roleCode],
      );
    }

    await query(
      `INSERT IGNORE INTO role_permissions (role_id, permission_id)
       SELECT r.id, p.id
       FROM roles r
       CROSS JOIN permissions p
       WHERE r.code = 'operator' AND p.code = 'review.manage'`,
    );

    await query(
      `UPDATE users SET last_login_at = created_at
       WHERE role IN ('admin', 'super_admin', 'disabled') AND last_login_at IS NULL`,
    );
  },
};

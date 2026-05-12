/**
 * 区分「已注销普通用户」与「已禁用后台管理员」：
 * - 普通用户注销：role 从 disabled → user_disabled（更清晰，避免后台 RBAC 列表误判）
 * - 后台禁用管理员：仍保留 role=disabled（且通常具备 user_roles 关联）
 */
module.exports = {
  async up(query) {
    // 仅迁移：已被注销（deleted_at 非空）且没有任何 RBAC 角色关联的账号
    await query(
      `UPDATE users u
         SET u.role = 'user_disabled'
       WHERE u.role = 'disabled'
         AND u.deleted_at IS NOT NULL
         AND NOT EXISTS (
           SELECT 1 FROM user_roles ur WHERE ur.user_id = u.id
         )`,
    ).catch(() => {});
  },
};


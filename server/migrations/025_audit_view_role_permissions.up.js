/**
 * 前台已移除「旧版操作日志」入口；原持有 admin_log.view 的角色补齐 audit.view，
 * 避免运营等角色侧边栏日志入口消失后无法查看审计记录。
 */
module.exports = {
  async up(query) {
    await query(`
      INSERT IGNORE INTO role_permissions (role_id, permission_id)
      SELECT rp.role_id, paudit.id
      FROM role_permissions rp
      JOIN permissions plegacy ON plegacy.id = rp.permission_id AND plegacy.code = 'admin_log.view'
      JOIN permissions paudit ON paudit.code = 'audit.view'
    `);
  },
};

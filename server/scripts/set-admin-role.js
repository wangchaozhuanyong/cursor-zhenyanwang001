/**
 * 将已有用户设为后台管理员（不修改密码）。
 *
 * 用法（在 server 目录）：
 *   node scripts/set-admin-role.js <手机号> [admin|super_admin|disabled]
 *
 * 紧急恢复（无任何超级管理员、无法进后台时）：
 *   1) SSH 登录服务器，cd 到本仓库 server 目录（如 /var/www/click-send-shop/server）
 *   2) 选一个可登录前台的账号手机号，执行：
 *        node scripts/set-admin-role.js 13800138000 super_admin
 *   3) 用该手机号 + 原密码登录 /admin/login
 *
 * 会同步更新 users.role 与 user_roles（RBAC）。
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");
const { syncAdminLegacyRoleToUserRoles } = require("./adminRbacSync");

async function main() {
  const phone = (process.argv[2] || "").trim();
  const role = (process.argv[3] || "admin").trim();
  if (!phone) {
    console.error("用法: node scripts/set-admin-role.js <手机号> [admin|super_admin|disabled]");
    process.exit(1);
  }
  if (!["admin", "super_admin", "disabled"].includes(role)) {
    console.error("角色必须是 admin / super_admin / disabled");
    process.exit(1);
  }
  const [[user]] = await db.query("SELECT id FROM users WHERE phone = ?", [phone]);
  if (!user) {
    console.error("未找到该手机号用户。若无任何后台账号，请先执行: node scripts/create-admin.js <手机号> <密码> [super]");
    process.exit(1);
  }
  await db.query("UPDATE users SET role = ? WHERE id = ?", [role, user.id]);
  await syncAdminLegacyRoleToUserRoles(user.id, role);
  console.log(`✅ 已设置角色为 ${role}:`, phone);
  console.log("   请用该账号原密码登录后台（未改密码）。");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

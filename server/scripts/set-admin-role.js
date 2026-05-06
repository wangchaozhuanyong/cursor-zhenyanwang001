/**
 * 将已有用户提升为管理员（不修改密码）。
 * 用法：node scripts/set-admin-role.js 13800138000 [admin|super_admin|disabled]
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

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
  const [r] = await db.query(
    "UPDATE users SET role = ? WHERE phone = ?",
    [role, phone],
  );
  if (r.affectedRows === 0) {
    console.error("未找到该手机号用户");
    process.exit(1);
  }
  console.log(`✅ 已设置角色为 ${role}:`, phone);
  console.log("   请用原密码登录 http://localhost:8080/admin/login");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

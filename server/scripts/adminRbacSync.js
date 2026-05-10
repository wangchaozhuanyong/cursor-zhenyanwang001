/**
 * 将 users.role（legacy）与 user_roles（RBAC）对齐，避免仅改 role 列但 RBAC 仍指向旧角色。
 */
const db = require("../src/config/db");

/**
 * @param {string} userId
 * @param {'super_admin'|'admin'|'disabled'|string} legacyRole
 */
async function syncAdminLegacyRoleToUserRoles(userId, legacyRole) {
  if (!userId) return;
  try {
    if (legacyRole === "disabled") {
      await db.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
      return;
    }
    if (legacyRole !== "super_admin" && legacyRole !== "admin") {
      await db.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
      return;
    }
    const code = legacyRole === "super_admin" ? "super_admin" : "admin_manager";
    const [[rid]] = await db.query("SELECT id FROM roles WHERE code = ? LIMIT 1", [code]);
    if (!rid) {
      console.warn("[adminRbacSync] 未找到 RBAC 角色", code, "（请确认已执行迁移 007_rbac）");
      return;
    }
    await db.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
    await db.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [userId, rid.id]);
  } catch (e) {
    console.warn("[adminRbacSync] 跳过后台角色同步:", e.message || e);
  }
}

module.exports = { syncAdminLegacyRoleToUserRoles };

/**
 * 物理删除管理员账号（users 行 + 关联数据 + 可选审计痕迹）。
 *
 * 用法（在 server 目录，先确认 .env 指向目标库）：
 *   node scripts/purge-admin-user.js 18800000001
 *   node scripts/purge-admin-user.js 18800000001 --execute
 *   node scripts/purge-admin-user.js 18800000001 --execute --purge-traces
 *
 * 默认仅预览；加 --execute 才会删除。
 * --purge-traces 会删除 audit_logs / admin_event 中该账号相关记录（不可恢复）。
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

const phoneArg = (process.argv[2] || "").trim();
const execute = process.argv.includes("--execute");
const purgeTraces = process.argv.includes("--purge-traces");

function phoneCandidates(phone) {
  const raw = phone.trim();
  const digits = raw.replace(/\D/g, "");
  const set = new Set([raw, digits]);
  if (digits.startsWith("60") && digits.length > 2) set.add(digits.slice(2));
  if (digits.startsWith("0")) set.add(digits.replace(/^0+/, ""));
  if (!digits.startsWith("60") && digits.length >= 9) set.add(`60${digits}`);
  return [...set].filter(Boolean);
}

async function countSuperAdmins(excludeUserId) {
  const [rows] = await db.query(
    `SELECT DISTINCT u.id, u.phone, u.nickname, u.role
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE (u.role = 'super_admin' OR r.code = 'super_admin')
       AND u.deleted_at IS NULL
       AND (? IS NULL OR u.id <> ?)`,
    [excludeUserId, excludeUserId],
  );
  return rows;
}

async function findUsers(phone) {
  const candidates = phoneCandidates(phone);
  if (!candidates.length) return [];
  const placeholders = candidates.map(() => "?").join(", ");
  const [rows] = await db.query(
    `SELECT id, phone, nickname, role, account_status, deleted_at, created_at
     FROM users
     WHERE phone IN (${placeholders})`,
    candidates,
  );
  return rows;
}

async function purgeUser(userId) {
  const conn = await db.getConnection();
  const stats = {};
  try {
    await conn.beginTransaction();

    const count = async (sql, params) => {
      const [[row]] = await conn.query(sql, params);
      return Number(row?.c || 0);
    };

    stats.orders = await count("SELECT COUNT(*) AS c FROM orders WHERE user_id = ?", [userId]);
    stats.audit_logs = await count(
      "SELECT COUNT(*) AS c FROM audit_logs WHERE operator_id = ? OR object_id = ?",
      [userId, userId],
    );
    stats.admin_event_states = await count(
      "SELECT COUNT(*) AS c FROM admin_event_user_states WHERE admin_user_id = ?",
      [userId],
    );

    if (purgeTraces) {
      const [a1] = await conn.query("DELETE FROM audit_logs WHERE operator_id = ? OR object_id = ?", [
        userId,
        userId,
      ]);
      stats.audit_logs_deleted = a1.affectedRows ?? 0;
      const [a2] = await conn.query(
        "DELETE FROM admin_event_actions WHERE operator_id = ?",
        [userId],
      );
      stats.admin_event_actions_deleted = a2.affectedRows ?? 0;
      const [a3] = await conn.query("DELETE FROM admin_event_user_states WHERE admin_user_id = ?", [
        userId,
      ]);
      stats.admin_event_user_states_deleted = a3.affectedRows ?? 0;
    }

    const [ur] = await conn.query("DELETE FROM user_roles WHERE user_id = ?", [userId]);
    stats.user_roles_deleted = ur.affectedRows ?? 0;

    const [mfa] = await conn.query("DELETE FROM admin_mfa_settings WHERE user_id = ?", [userId]);
    stats.admin_mfa_deleted = mfa.affectedRows ?? 0;

    const [dev] = await conn.query("DELETE FROM admin_trusted_devices WHERE user_id = ?", [userId]);
    stats.admin_trusted_devices_deleted = dev.affectedRows ?? 0;

    const [u] = await conn.query("DELETE FROM users WHERE id = ?", [userId]);
    stats.users_deleted = u.affectedRows ?? 0;

    await conn.commit();
    return stats;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function main() {
  if (!phoneArg) {
    console.error("用法: node scripts/purge-admin-user.js <手机号> [--execute] [--purge-traces]");
    process.exit(1);
  }

  const users = await findUsers(phoneArg);
  if (!users.length) {
    console.error(`未找到手机号为 ${phoneArg} 的用户（已尝试多种格式）`);
    process.exit(1);
  }
  if (users.length > 1) {
    console.error("匹配到多个用户，请手动确认后再执行:", users);
    process.exit(1);
  }

  const user = users[0];
  const [[rbac]] = await db.query(
    `SELECT GROUP_CONCAT(r.code) AS role_codes, GROUP_CONCAT(r.name) AS role_names
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?`,
    [user.id],
  );

  const isSuper = user.role === "super_admin" || String(rbac?.role_codes || "").includes("super_admin");
  const remainingSupers = await countSuperAdmins(user.id);

  console.log("=== 待删除账号 ===");
  console.log(JSON.stringify({ ...user, rbac, isSuper }, null, 2));
  console.log("\n=== 删除后仍将保留的超级管理员 ===");
  console.log(JSON.stringify(remainingSupers, null, 2));

  if (isSuper && remainingSupers.length === 0) {
    console.error(
      "\n拒绝执行：这是唯一的超级管理员。请先创建并验证另一个超级管理员账号，再删除本账号。",
    );
    process.exit(1);
  }

  console.log("\n=== 影响说明 ===");
  console.log("- 商城前台、订单、商品、支付等业务数据不受影响（除非该账号曾作为普通用户下单）。");
  console.log("- 该账号将无法再登录后台。");
  console.log("- 脚本默认不会删除 audit_logs；加 --purge-traces 可清除其操作审计记录。");
  console.log(`- 模式: ${execute ? "执行删除" : "仅预览（加 --execute 才会删除）"}`);

  if (!execute) {
    console.log("\n预览完成。确认后请执行:");
    console.log(`  node scripts/purge-admin-user.js ${phoneArg} --execute${purgeTraces ? " --purge-traces" : ""}`);
    return;
  }

  const stats = await purgeUser(user.id);
  console.log("\n=== 已删除 ===");
  console.log(JSON.stringify(stats, null, 2));
  if (stats.orders > 0) {
    console.warn(`注意：该用户曾有 ${stats.orders} 笔订单记录（orders 表未删，仅删除登录账号）。`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

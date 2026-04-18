/**
 * 创建或重置本地管理员（手机号 + 密码，与前台用户同表，role=admin）。
 * 用法（在 server 目录）：
 *   node scripts/create-admin.js
 *   node scripts/create-admin.js 13900000000 MySecretPass
 *
 * 未传参数时默认：18800000001 / Admin123456
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");
const { generateId, generateInviteCode, hashPassword } = require("../src/utils/helpers");

async function uniqueInviteCode() {
  for (let i = 0; i < 30; i += 1) {
    const code = generateInviteCode();
    const [[row]] = await db.query("SELECT id FROM users WHERE invite_code = ?", [code]);
    if (!row) return code;
  }
  throw new Error("无法生成唯一邀请码");
}

async function main() {
  const phone = (process.argv[2] || "18800000001").trim();
  const password = process.argv[3] || "Admin123456";
  if (!phone) {
    console.error("手机号不能为空");
    process.exit(1);
  }
  if (password.length < 6) {
    console.error("密码至少 6 位");
    process.exit(1);
  }

  const hash = await hashPassword(password);
  const [[existing]] = await db.query("SELECT id FROM users WHERE phone = ?", [phone]);

  if (existing) {
    await db.query(
      "UPDATE users SET password_hash = ?, role = 'admin' WHERE phone = ?",
      [hash, phone],
    );
    try {
      const [[rid]] = await db.query("SELECT id FROM roles WHERE code = 'admin_manager' LIMIT 1");
      if (rid) {
        await db.query("DELETE FROM user_roles WHERE user_id = ?", [existing.id]);
        await db.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [existing.id, rid.id]);
      }
    } catch {
      /* RBAC 表未迁移时忽略 */
    }
    console.log("✅ 已将该手机号设为管理员并重置密码");
  } else {
    const id = generateId();
    const invite = await uniqueInviteCode();
    await db.query(
      `INSERT INTO users (id, phone, password_hash, nickname, invite_code, parent_invite_code)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, phone, hash, "管理员", invite, ""],
    );
    await db.query("UPDATE users SET role = 'admin' WHERE phone = ?", [phone]);
    try {
      const [[rid]] = await db.query("SELECT id FROM roles WHERE code = 'admin_manager' LIMIT 1");
      if (rid) {
        await db.query("DELETE FROM user_roles WHERE user_id = ?", [id]);
        await db.query("INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)", [id, rid.id]);
      }
    } catch {
      /* RBAC 表未迁移时忽略 */
    }
    console.log("✅ 已新建管理员账号");
  }

  console.log("");
  console.log("  手机号:", phone);
  console.log("  密码:  ", password);
  console.log("  后台:  http://localhost:8080/admin/login");
  console.log("");
  console.log("提示：首次部署请尽快修改密码；勿将默认密码用于生产环境。");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

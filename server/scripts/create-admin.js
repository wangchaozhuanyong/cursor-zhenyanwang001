/**
 * 创建或重置本地管理员（手机号 + 密码，与前台用户同表）。
 *
 * 用法（在 server 目录）：
 *   node scripts/create-admin.js
 *   node scripts/create-admin.js 13900000000 MySecretPass
 *   node scripts/create-admin.js 13900000000 MySecretPass super
 *
 * 第三个参数为 super 时：设为超级管理员（users.role=super_admin + RBAC 同步）。
 * 未传参数时默认：18800000001 / Admin123456 / 普通管理员 admin
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");
const { generateId, generateInviteCode, hashPassword } = require("../src/utils/helpers");
const { syncAdminLegacyRoleToUserRoles } = require("./adminRbacSync");
const {
  buildPhoneLookupCandidates,
  inferCountryCodeForPhone,
  normalizeIntlPhone,
} = require("../src/utils/phone");

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
  const tier = String(process.argv[4] || "").toLowerCase();
  const isSuper = tier === "super" || tier === "super_admin";

  if (!phone) {
    console.error("手机号不能为空");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("密码至少 8 位，并包含大写字母、小写字母和数字");
    process.exit(1);
  }
  if (password.length > 64) {
    console.error("密码不能超过 64 位");
    process.exit(1);
  }
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    console.error("密码必须包含大写字母、小写字母和数字");
    process.exit(1);
  }

  const legacyRole = isSuper ? "super_admin" : "admin";
  const hash = await hashPassword(password);
  const cc = inferCountryCodeForPhone(phone) || "86";
  const normalizedPhone = normalizeIntlPhone(phone, cc) || phone;
  const lookupPhones = buildPhoneLookupCandidates(normalizedPhone, cc);
  const placeholders = lookupPhones.map(() => "?").join(",");
  const [existingRows] = await db.query(
    `SELECT id, phone FROM users WHERE phone IN (${placeholders}) AND deleted_at IS NULL ORDER BY created_at DESC LIMIT 1`,
    lookupPhones,
  );
  const existing = existingRows[0];

  if (existing) {
    await db.query(
      "UPDATE users SET phone = ?, password_hash = ?, role = ?, account_status = 'normal' WHERE id = ?",
      [normalizedPhone, hash, legacyRole, existing.id],
    );
    await syncAdminLegacyRoleToUserRoles(existing.id, legacyRole);
    console.log(`✅ 已将该手机号设为${isSuper ? "超级" : ""}管理员并重置密码`);
  } else {
    const id = generateId();
    const invite = await uniqueInviteCode();
    await db.query(
      `INSERT INTO users (id, phone, password_hash, nickname, invite_code, parent_invite_code, role, account_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'normal')`,
      [id, normalizedPhone, hash, isSuper ? "超级管理员" : "管理员", invite, "", legacyRole],
    );
    await syncAdminLegacyRoleToUserRoles(id, legacyRole);
    console.log(`✅ 已新建${isSuper ? "超级" : ""}管理员账号`);
  }

  console.log("");
  console.log("  手机号:", normalizedPhone);
  console.log("  密码:  ", password);
  console.log("  角色:  ", legacyRole);
  console.log("  后台:  使用站点域名 /admin/login");
  console.log("");
  console.log("提示：生产环境请尽快修改密码；勿泄露脚本输出。");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

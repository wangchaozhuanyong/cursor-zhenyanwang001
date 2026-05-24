/**
 * 重置管理员 MFA 绑定（删除 admin_mfa_settings 与可信设备）。
 * 用法：node scripts/reset-admin-mfa.js <手机号>
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");
const { buildPhoneLookupCandidates } = require("../src/utils/phone");

async function main() {
  const phone = (process.argv[2] || "").trim();
  if (!phone) {
    console.error("用法: node scripts/reset-admin-mfa.js <手机号>");
    process.exit(1);
  }
  const cands = buildPhoneLookupCandidates(phone, "86");
  const ph = cands.map(() => "?").join(",");
  const [[user]] = await db.query(
    `SELECT id, phone, role FROM users WHERE phone IN (${ph}) LIMIT 1`,
    cands,
  );
  if (!user) {
    console.error("未找到该手机号对应的管理员");
    process.exit(1);
  }
  await db.query("DELETE FROM admin_trusted_devices WHERE user_id = ?", [user.id]);
  const [r] = await db.query("DELETE FROM admin_mfa_settings WHERE user_id = ?", [user.id]);
  console.log(`已重置 ${user.phone} 的 MFA（删除 ${r.affectedRows ?? 0} 条设置）`);
  console.log("下次登录需重新绑定身份验证器。");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

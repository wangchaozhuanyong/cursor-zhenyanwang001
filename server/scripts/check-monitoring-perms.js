require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

(async () => {
  const [[u]] = await db.query("SELECT id, phone, role FROM users WHERE phone = ?", ["18800000001"]);
  const [roles] = await db.query(
    `SELECT r.code, r.name FROM user_roles ur JOIN roles r ON r.id = ur.role_id WHERE ur.user_id = ?`,
    [u.id],
  );
  const [perms] = await db.query(
    `SELECT DISTINCT p.code FROM user_roles ur
     JOIN role_permissions rp ON rp.role_id = ur.role_id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = ? AND p.code LIKE 'monitoring.%'`,
    [u.id],
  );
  console.log(JSON.stringify({ user: u, roles, monitoringPerms: perms.map((p) => p.code) }, null, 2));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

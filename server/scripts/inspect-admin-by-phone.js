require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const db = require("../src/config/db");

const phone = (process.argv[2] || "18800000001").trim();

async function main() {
  const [rows] = await db.query(
    `SELECT id, phone, nickname, role, account_status, deleted_at, created_at
     FROM users WHERE phone = ? OR phone LIKE ?`,
    [phone, `%${phone.replace(/^0+/, "")}%`],
  );
  const [supers] = await db.query(
    `SELECT id, phone, nickname, role, deleted_at FROM users WHERE role = 'super_admin'`,
  );
  const [admins] = await db.query(
    `SELECT id, phone, nickname, role, deleted_at FROM users WHERE role IN ('admin','super_admin')`,
  );
  console.log(JSON.stringify({ phone, target: rows, super_admins: supers, all_admins: admins }, null, 2));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });

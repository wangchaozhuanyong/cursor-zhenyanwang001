#!/usr/bin/env node
const db = require('../src/config/db');

(async () => {
  const [[user]] = await db.query(
    "SELECT id, phone, role FROM users WHERE phone = '18800000001' LIMIT 1",
  );
  console.log('user', user);
  if (!user) {
    process.exit(0);
  }
  const [perms] = await db.query(
    `SELECT p.code
       FROM permissions p
       JOIN role_permissions rp ON rp.permission_id = p.id
       JOIN user_roles ur ON ur.role_id = rp.role_id
      WHERE ur.user_id = ? AND p.code LIKE 'monitoring.%'`,
    [user.id],
  );
  console.log('monitoring perms via roles', perms.map((x) => x.code));
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

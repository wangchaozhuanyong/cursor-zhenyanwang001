/**
 * 为本地恢复/切换授予 gc_app 创建临时库权限（需 MySQL root）。
 * 用法：node scripts/grant-restore-privileges.js <mysql-root-password>
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function main() {
  const rootPassword = process.argv[2] || process.env.MYSQL_ROOT_PASSWORD;
  if (!rootPassword) {
    throw new Error('请提供 root 密码：node scripts/grant-restore-privileges.js <password> 或设置 MYSQL_ROOT_PASSWORD');
  }

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const appUser = process.env.DB_USER || 'gc_app';

  const root = await mysql.createConnection({
    host,
    port,
    user: 'root',
    password: rootPassword,
    multipleStatements: false,
  });

  try {
    await root.query(`GRANT CREATE, DROP ON *.* TO ?@'localhost'`, [appUser]);
    await root.query(`GRANT CREATE, DROP ON *.* TO ?@'127.0.0.1'`, [appUser]);
    await root.query('FLUSH PRIVILEGES');
    console.log(`[restore-grant] 已为 ${appUser} 授予 CREATE/DROP 权限（本地恢复临时库）`);
  } finally {
    await root.end();
  }
}

main().catch((err) => {
  console.error('[restore-grant] failed:', err.message || err);
  process.exit(1);
});

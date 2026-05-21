/**
 * Bootstrap local MySQL for development (Windows-friendly).
 * Usage: set MYSQL_ROOT_PASSWORD=*** && node scripts/bootstrap-local-mysql.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mysql = require('mysql2/promise');

async function main() {
  const rootPassword = process.argv[2] || process.env.MYSQL_ROOT_PASSWORD;
  if (!rootPassword) {
    throw new Error('Usage: node scripts/bootstrap-local-mysql.js <mysql-root-password>');
  }

  const host = process.env.DB_HOST || '127.0.0.1';
  const port = Number(process.env.DB_PORT || 3306);
  const dbName = process.env.DB_NAME || 'click_send_shop';
  const appUser = process.env.DB_USER || 'gc_app';
  const appPassword = process.env.DB_PASSWORD;
  if (!appUser || !appPassword) {
    throw new Error('DB_USER and DB_PASSWORD must be set in .env');
  }

  const root = await mysql.createConnection({
    host,
    port,
    user: 'root',
    password: rootPassword,
    multipleStatements: false,
  });

  try {
    await root.query(
      `CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await root.query(
      `CREATE USER IF NOT EXISTS ?@'localhost' IDENTIFIED BY ?`,
      [appUser, appPassword],
    );
    await root.query(
      `CREATE USER IF NOT EXISTS ?@'127.0.0.1' IDENTIFIED BY ?`,
      [appUser, appPassword],
    );
    await root.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO ?@'localhost'`, [appUser]);
    await root.query(`GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO ?@'127.0.0.1'`, [appUser]);
    await root.query('FLUSH PRIVILEGES');
    console.log(`[bootstrap] database ${dbName} and user ${appUser} ready on ${host}:${port}`);
  } finally {
    await root.end();
  }

  const app = await mysql.createConnection({
    host,
    port,
    user: appUser,
    password: appPassword,
    database: dbName,
  });
  await app.query('SELECT 1');
  await app.end();
  console.log('[bootstrap] application user connection verified');
}

main().catch((err) => {
  console.error('[bootstrap] failed:', err.message || err);
  process.exit(1);
});

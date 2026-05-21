const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TEST_DB_NAME = process.env.TEST_DB_NAME || 'click_send_shop_test';
const DB_SOCKET = process.env.DB_ADMIN_SOCKET || '/var/run/mysqld/mysqld.sock';

function assertSafeTestDbName(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe database name: ${name}`);
  }
  if (!/(test|ci|dev|staging)/i.test(name) && process.env.ALLOW_PRODUCTION_DB_TESTS !== '1') {
    throw new Error(`Refusing to grant database "${name}". Test database name must include test/ci/dev/staging.`);
  }
}

async function main() {
  assertSafeTestDbName(TEST_DB_NAME);
  if (!process.env.DB_USER || !process.env.DB_PASSWORD) {
    throw new Error('DB_USER and DB_PASSWORD must be set in .env');
  }

  const connection = await mysql.createConnection({
    user: process.env.DB_ADMIN_USER || 'root',
    socketPath: DB_SOCKET,
    multipleStatements: false,
  });

  const appUser = connection.escape(process.env.DB_USER);
  const appHost = connection.escape(process.env.DB_GRANT_HOST || 'localhost');
  const appPassword = connection.escape(process.env.DB_PASSWORD);
  const databaseId = `\`${TEST_DB_NAME}\``;

  try {
    await connection.query(`CREATE DATABASE IF NOT EXISTS ${databaseId} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
    await connection.query(`CREATE USER IF NOT EXISTS ${appUser}@${appHost} IDENTIFIED BY ${appPassword}`);
    await connection.query(`GRANT ALL PRIVILEGES ON ${databaseId}.* TO ${appUser}@${appHost}`);
    await connection.query('FLUSH PRIVILEGES');
    console.log(`granted ${process.env.DB_USER}@${process.env.DB_GRANT_HOST || 'localhost'} on ${TEST_DB_NAME}`);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

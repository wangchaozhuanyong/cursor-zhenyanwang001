const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const TEST_DB_NAME = process.env.TEST_DB_NAME || 'click_send_shop_test';

function assertSafeTestDbName(name) {
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    throw new Error(`Unsafe database name: ${name}`);
  }
  if (!/(test|ci|dev|staging)/i.test(name) && process.env.ALLOW_PRODUCTION_DB_TESTS !== '1') {
    throw new Error(`Refusing to create database "${name}". Test database name must include test/ci/dev/staging.`);
  }
}

async function main() {
  assertSafeTestDbName(TEST_DB_NAME);
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    multipleStatements: false,
  });

  try {
    await connection.query(
      `CREATE DATABASE IF NOT EXISTS \`${TEST_DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`,
    );
    await connection.query(`USE \`${TEST_DB_NAME}\``);
    console.log(`created_or_exists ${TEST_DB_NAME}`);
  } finally {
    await connection.end();
  }

  if (process.argv.includes('--migrate')) {
    process.env.NODE_ENV = 'test';
    process.env.DB_NAME = TEST_DB_NAME;
    const { runPendingMigrations } = require('../src/db/migrateRunner');
    await runPendingMigrations();
    const db = require('../src/config/db');
    await db.end().catch(() => {});
    console.log(`migrated ${TEST_DB_NAME}`);
  }
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});

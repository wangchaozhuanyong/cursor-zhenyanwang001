/**
 * Verify critical database columns after deployment/migration.
 * Run from server/: node scripts/verify-critical-schema.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/config/db');

const REQUIRED_COLUMNS = [
  { table: 'product_variants', column: 'updated_at' },
  { table: 'coupons', column: 'claimed_count' },
  { table: 'user_coupons', column: 'coupon_snapshot' },
  { table: 'user_coupons', column: 'valid_from' },
];

const REQUIRED_COLUMN_LENGTHS = [
  { table: 'audit_logs', column: 'object_id', minLength: 191 },
];

async function columnExists(table, column) {
  const [[row]] = await db.query(
    `SELECT COUNT(*) AS c
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column],
  );
  return Number(row.c) > 0;
}

async function getColumnInfo(table, column) {
  const [[row]] = await db.query(
    `SELECT CHARACTER_MAXIMUM_LENGTH AS maxLength
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column],
  );
  return row || null;
}

(async () => {
  const missing = [];
  const invalidLengths = [];

  for (const { table, column } of REQUIRED_COLUMNS) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await columnExists(table, column))) missing.push(`${table}.${column}`);
  }

  for (const { table, column, minLength } of REQUIRED_COLUMN_LENGTHS) {
    // eslint-disable-next-line no-await-in-loop
    const columnInfo = await getColumnInfo(table, column);
    const maxLength = Number(columnInfo?.maxLength || 0);
    if (!columnInfo || maxLength < minLength) {
      invalidLengths.push(`${table}.${column} length ${maxLength || 'missing'} < ${minLength}`);
    }
  }

  if (missing.length || invalidLengths.length) {
    console.error('Critical schema check failed. Please run npm run migrate:');
    missing.forEach((m) => console.error(`   - missing ${m}`));
    invalidLengths.forEach((m) => console.error(`   - invalid ${m}`));
    process.exit(1);
  }

  console.log('critical schema ok');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

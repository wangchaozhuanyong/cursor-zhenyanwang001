/**
 * 部署后校验关键列是否存在，避免「代码已引用列但迁移未执行」导致 500 反复出现。
 * 用法：在 server 目录执行 node scripts/verify-critical-schema.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const db = require('../src/config/db');

const REQUIRED_COLUMNS = [
  { table: 'product_variants', column: 'updated_at' },
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

(async () => {
  const missing = [];
  for (const { table, column } of REQUIRED_COLUMNS) {
    // eslint-disable-next-line no-await-in-loop
    if (!(await columnExists(table, column))) missing.push(`${table}.${column}`);
  }
  if (missing.length) {
    console.error('❌ 数据库缺少关键列（请执行 npm run migrate）：');
    missing.forEach((m) => console.error(`   - ${m}`));
    process.exit(1);
  }
  console.log('✅ 关键 schema 校验通过');
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});

const { before, after } = require('node:test');
const db = require('../src/config/db');
const { runPendingMigrations } = require('../src/db/migrateRunner');

const CLOSED_KEY = '__CLICK_SEND_SHOP_DB_CLOSED__';
// 测试运行依赖真实 MySQL，确保 schema 与最新 migrations 对齐。
before(async () => {
  await runPendingMigrations();
});

after(async () => {
  if (global[CLOSED_KEY]) return;
  global[CLOSED_KEY] = true;
  await db.end().catch(() => {});
});

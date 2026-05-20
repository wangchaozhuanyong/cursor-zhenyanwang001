const { before, after } = require('node:test');
const db = require('../src/config/db');
const { runPendingMigrations } = require('../src/db/migrateRunner');

const CLOSED_KEY = '__CLICK_SEND_SHOP_DB_CLOSED__';
// Ensure schema is up to date before tests run.
before(async () => {
  await runPendingMigrations();
});

after(async () => {
  if (global[CLOSED_KEY]) return;
  global[CLOSED_KEY] = true;
  await db.end().catch(() => {});
});


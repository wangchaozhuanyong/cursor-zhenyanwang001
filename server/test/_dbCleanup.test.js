const { after } = require('node:test');
const db = require('../src/config/db');

const CLOSED_KEY = '__CLICK_SEND_SHOP_DB_CLOSED__';

after(async () => {
  if (global[CLOSED_KEY]) return;
  global[CLOSED_KEY] = true;
  await db.end().catch(() => {});
});

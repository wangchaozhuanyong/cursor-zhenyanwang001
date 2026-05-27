#!/usr/bin/env node
require('dotenv').config({ quiet: true });
const db = require('../src/config/db');

async function main() {
  const [[{ n: total }]] = await db.query(
    'SELECT COUNT(*) AS n FROM marketing_activities WHERE deleted_at IS NULL',
  );
  const [byType] = await db.query(
    `SELECT type, status, COUNT(*) AS n FROM marketing_activities
     WHERE deleted_at IS NULL GROUP BY type, status`,
  );
  const [recent] = await db.query(
    `SELECT id, title, type, status, disabled, start_at, end_at, display_positions
     FROM marketing_activities WHERE deleted_at IS NULL ORDER BY updated_at DESC LIMIT 10`,
  );
  console.log(JSON.stringify({ total, byType, recent }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

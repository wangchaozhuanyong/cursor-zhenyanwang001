/**
 * 版本化迁移：migrations 目录下每个迁移为一对
 *   <name>.up.sql   / <name>.down.sql
 * 或 <name>.up.js   / <name>.down.js  （导出 async up(query)/down(query)，query(sql, params)）
 * 已执行记录表：schema_migrations
 */
const fs = require('fs');
const path = require('path');
const db = require('../config/db');

const MIGRATIONS_DIR = path.join(__dirname, '..', '..', 'migrations');

async function ensureTable() {
  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(255) NOT NULL PRIMARY KEY,
      applied_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB
  `);
}

async function getAppliedNames() {
  const [rows] = await db.query('SELECT name FROM schema_migrations ORDER BY name');
  return new Set(rows.map((r) => r.name));
}

/**
 * @param {import('mysql2/promise').Pool} pool
 */
function createQuery(pool) {
  return async (sql, params = []) => {
    await pool.query(sql, params);
  };
}

/**
 * 执行 pending 的 up 迁移（按文件名排序）
 */
async function runPendingMigrations() {
  await ensureTable();
  const applied = await getAppliedNames();
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return;
  }

  const entries = fs.readdirSync(MIGRATIONS_DIR);
  const bases = new Set();
  for (const f of entries) {
    const m = f.match(/^(.+)\.up\.(sql|js)$/);
    if (m) bases.add(m[1]);
  }
  const sorted = [...bases].sort();

  const query = createQuery(db);

  for (const name of sorted) {
    if (applied.has(name)) continue;

    const sqlPath = path.join(MIGRATIONS_DIR, `${name}.up.sql`);
    const jsPath = path.join(MIGRATIONS_DIR, `${name}.up.js`);

    const conn = await db.getConnection();
    try {
      await conn.beginTransaction();
      if (fs.existsSync(sqlPath)) {
        const sql = fs.readFileSync(sqlPath, 'utf8').trim();
        if (sql) await conn.query(sql);
      } else if (fs.existsSync(jsPath)) {
        const mod = require(path.resolve(jsPath));
        if (typeof mod.up !== 'function') throw new Error(`${name}.up.js 必须导出 up()`);
        await mod.up((s, p) => conn.query(s, p || []));
      } else {
        throw new Error(`迁移 ${name} 缺少 ${name}.up.sql 或 ${name}.up.js`);
      }
      await conn.query('INSERT INTO schema_migrations (name) VALUES (?)', [name]);
      await conn.commit();
      console.log(`✅ migration up: ${name}`);
    } catch (e) {
      await conn.rollback();
      throw e;
    } finally {
      conn.release();
    }
  }
}

/**
 * 回滚最近一条已执行迁移（down）
 */
async function runLastMigrationDown() {
  await ensureTable();
  const [rows] = await db.query(
    'SELECT name FROM schema_migrations ORDER BY applied_at DESC, name DESC LIMIT 1',
  );
  if (!rows.length) {
    console.log('（无已执行迁移）');
    return;
  }
  const name = rows[0].name;

  const sqlPath = path.join(MIGRATIONS_DIR, `${name}.down.sql`);
  const jsPath = path.join(MIGRATIONS_DIR, `${name}.down.js`);

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    if (fs.existsSync(sqlPath)) {
      const sql = fs.readFileSync(sqlPath, 'utf8').trim();
      if (sql) await conn.query(sql);
    } else if (fs.existsSync(jsPath)) {
      const mod = require(path.resolve(jsPath));
      if (typeof mod.down !== 'function') throw new Error(`${name}.down.js 必须导出 down()`);
      await mod.down((s, p) => conn.query(s, p || []));
    } else {
      throw new Error(`迁移 ${name} 缺少 ${name}.down.sql 或 ${name}.down.js`);
    }
    await conn.query('DELETE FROM schema_migrations WHERE name = ?', [name]);
    await conn.commit();
    console.log(`✅ migration down: ${name}`);
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

/**
 * 打印状态
 */
async function migrationStatus() {
  await ensureTable();
  const applied = await getAppliedNames();
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log('migrations 目录不存在');
    return;
  }
  const entries = fs.readdirSync(MIGRATIONS_DIR);
  const bases = new Set();
  for (const f of entries) {
    const m = f.match(/^(.+)\.up\.(sql|js)$/);
    if (m) bases.add(m[1]);
  }
  const sorted = [...bases].sort();
  for (const name of sorted) {
    console.log(applied.has(name) ? `  [x] ${name}` : `  [ ] ${name}`);
  }
}

module.exports = {
  runPendingMigrations,
  runLastMigrationDown,
  migrationStatus,
  MIGRATIONS_DIR,
};

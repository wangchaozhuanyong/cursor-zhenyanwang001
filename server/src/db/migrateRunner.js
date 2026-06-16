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

async function listAppliedMigrationNames() {
  await ensureTable();
  const [rows] = await db.query('SELECT name FROM schema_migrations ORDER BY name');
  return rows.map((r) => r.name);
}

/**
 * @param {import('mysql2/promise').Pool} pool
 */
function createQuery(pool) {
  return async (sql, params = []) => {
    await pool.query(sql, params);
  };
}

function listMigrationBases() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return [];
  }
  const entries = fs.readdirSync(MIGRATIONS_DIR);
  const bases = new Set();
  for (const f of entries) {
    const m = f.match(/^(.+)\.up\.(sql|js)$/);
    if (m) bases.add(m[1]);
  }
  return [...bases].sort();
}

function getMigrationPaths(name, direction) {
  return {
    sqlPath: path.join(MIGRATIONS_DIR, `${name}.${direction}.sql`),
    jsPath: path.join(MIGRATIONS_DIR, `${name}.${direction}.js`),
  };
}

async function runMigrationFile(conn, name, direction) {
  const { sqlPath, jsPath } = getMigrationPaths(name, direction);

  if (fs.existsSync(sqlPath)) {
    const sql = fs.readFileSync(sqlPath, 'utf8').trim();
    if (sql) await conn.query(sql);
    return;
  }

  if (fs.existsSync(jsPath)) {
    const mod = require(path.resolve(jsPath));
    if (typeof mod[direction] !== 'function') {
      throw new Error(`${name}.${direction}.js 必须导出 ${direction}()`);
    }
    await mod[direction]((s, p) => conn.query(s, p || []));
    return;
  }

  throw new Error(`迁移 ${name} 缺少 ${name}.${direction}.sql 或 ${name}.${direction}.js`);
}

function normalizeMigrationNames(names = []) {
  return names.map((name) => String(name || '').trim()).filter(Boolean);
}

async function runMigrationUpByName(name) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await runMigrationFile(conn, name, 'up');
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

async function runMigrationDownByName(name) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await runMigrationFile(conn, name, 'down');
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
 * 执行 pending 的 up 迁移（按文件名排序）
 */
async function runPendingMigrations() {
  await ensureTable();
  // 防并发：同一数据库可能被多个进程/测试 worker 同时触发迁移。
  // 使用 MySQL advisory lock 串行化迁移窗口，避免重复插入 schema_migrations。
  const lockConn = await db.getConnection();
  let locked = false;
  try {
    const [[row]] = await lockConn.query("SELECT GET_LOCK('click_send_shop_schema_migrations', 30) AS ok");
    locked = Number(row?.ok) === 1;
    if (!locked) throw new Error('获取迁移锁失败（GET_LOCK timeout）');

    const applied = await getAppliedNames();
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    fs.mkdirSync(MIGRATIONS_DIR, { recursive: true });
    return;
  }

  const sorted = listMigrationBases();

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
  } finally {
    try {
      if (locked) await lockConn.query("SELECT RELEASE_LOCK('click_send_shop_schema_migrations')");
    } catch { /* ignore */ }
    lockConn.release();
  }
}

async function runNamedMigrations(names = []) {
  const normalizedNames = normalizeMigrationNames(names);
  if (!normalizedNames.length) throw new Error('请提供要执行的迁移名称');

  await ensureTable();
  const available = new Set(listMigrationBases());
  const unknown = normalizedNames.filter((name) => !available.has(name));
  if (unknown.length) {
    throw new Error(`迁移不存在: ${unknown.join(', ')}`);
  }

  const lockConn = await db.getConnection();
  let locked = false;
  try {
    const [[row]] = await lockConn.query("SELECT GET_LOCK('click_send_shop_schema_migrations', 30) AS ok");
    locked = Number(row?.ok) === 1;
    if (!locked) throw new Error('获取迁移锁失败（GET_LOCK timeout）');

    const applied = await getAppliedNames();
    for (const name of normalizedNames) {
      if (applied.has(name)) {
        console.log(`↷ migration already applied: ${name}`);
        continue;
      }
      await runMigrationUpByName(name);
      applied.add(name);
    }
  } finally {
    try {
      if (locked) await lockConn.query("SELECT RELEASE_LOCK('click_send_shop_schema_migrations')");
    } catch { /* ignore */ }
    lockConn.release();
  }
}

async function runNamedMigrationsDown(names = []) {
  const normalizedNames = normalizeMigrationNames(names);
  if (!normalizedNames.length) throw new Error('请提供要回滚的迁移名称');

  await ensureTable();
  const sorted = listMigrationBases();
  const available = new Set(sorted);
  const unknown = normalizedNames.filter((name) => !available.has(name));
  if (unknown.length) {
    throw new Error(`迁移不存在: ${unknown.join(', ')}`);
  }

  const lockConn = await db.getConnection();
  let locked = false;
  try {
    const [[row]] = await lockConn.query("SELECT GET_LOCK('click_send_shop_schema_migrations', 30) AS ok");
    locked = Number(row?.ok) === 1;
    if (!locked) throw new Error('获取迁移锁失败（GET_LOCK timeout）');

    const applied = await getAppliedNames();
    for (const name of normalizedNames) {
      if (!applied.has(name)) {
        console.log(`↷ migration not applied: ${name}`);
        continue;
      }

      const index = sorted.indexOf(name);
      const laterApplied = sorted.slice(index + 1).filter((candidate) => applied.has(candidate));
      if (laterApplied.length) {
        throw new Error(`不能回滚 ${name}：后续迁移仍已应用 ${laterApplied.join(', ')}，请按倒序回滚`);
      }

      await runMigrationDownByName(name);
      applied.delete(name);
    }
  } finally {
    try {
      if (locked) await lockConn.query("SELECT RELEASE_LOCK('click_send_shop_schema_migrations')");
    } catch { /* ignore */ }
    lockConn.release();
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
  await runMigrationDownByName(name);
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
  const sorted = listMigrationBases();
  for (const name of sorted) {
    console.log(applied.has(name) ? `  [x] ${name}` : `  [ ] ${name}`);
  }
}

async function listPendingMigrationNames() {
  await ensureTable();
  if (!fs.existsSync(MIGRATIONS_DIR)) return [];
  const applied = await getAppliedNames();
  return listMigrationBases().filter((name) => !applied.has(name));
}

module.exports = {
  runPendingMigrations,
  runNamedMigrations,
  runNamedMigrationsDown,
  runLastMigrationDown,
  migrationStatus,
  listPendingMigrationNames,
  listAppliedMigrationNames,
  listMigrationBases,
  MIGRATIONS_DIR,
};

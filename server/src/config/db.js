const mysql = require('mysql2/promise');
const { recordDbDuration } = require('../utils/requestPerf');

const isProduction = process.env.NODE_ENV === 'production';
const dbUser = process.env.DB_USER || (isProduction ? undefined : 'click_send_app');
const dbPassword = process.env.DB_PASSWORD || (isProduction ? undefined : '');

if (isProduction && (!dbUser || !dbPassword)) {
  throw new Error('Production DB_USER and DB_PASSWORD must be set');
}

/**
 * MySQL connections must use utf8mb4 to prevent Chinese product/category text
 * from being saved as mojibake. If production still shows broken text, inspect:
 *   SHOW VARIABLES LIKE 'character_set%';
 *   SHOW VARIABLES LIKE 'collation%';
 *   SHOW FULL COLUMNS FROM categories;
 * Existing corrupted rows require a separate data repair, not source conversion.
 */
const pool = mysql.createPool({
  host:            process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT)    || 3306,
  user:            dbUser,
  password:        dbPassword,
  database:        process.env.DB_NAME     || 'click_send_shop',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  typeCast(field, next) {
    if (field.type === 'TINY' && field.length === 1) {
      return field.string() === '1';
    }
    return next();
  },
});

function resolveSlowQueryThresholdMs() {
  const raw = Number(process.env.DB_SLOW_QUERY_MS || process.env.DB_SLOW_QUERY_THRESHOLD_MS || 0);
  return Number.isFinite(raw) && raw > 0 ? raw : 0;
}

function compactSql(sql) {
  return String(sql || '').replace(/\s+/g, ' ').trim().slice(0, 500);
}

function installSlowQueryLogger(targetPool) {
  const thresholdMs = resolveSlowQueryThresholdMs();
  if (!thresholdMs) return;

  const wrapQuery = (queryFn, scope) => async function timedQuery(sql, params) {
    const startedAt = Date.now();
    try {
      return await queryFn(sql, params);
    } finally {
      const elapsedMs = Date.now() - startedAt;
      recordDbDuration(elapsedMs);
      if (elapsedMs >= thresholdMs) {
        console.warn('[db.slow_query]', JSON.stringify({
          scope,
          elapsed_ms: elapsedMs,
          threshold_ms: thresholdMs,
          sql: compactSql(sql),
        }));
      }
    }
  };

  const originalPoolQuery = targetPool.query.bind(targetPool);
  targetPool.query = wrapQuery(originalPoolQuery, 'pool');

  const originalGetConnection = targetPool.getConnection.bind(targetPool);
  targetPool.getConnection = async function getTimedConnection() {
    const conn = await originalGetConnection();
    if (!conn.__slowQueryLoggerInstalled) {
      conn.query = wrapQuery(conn.query.bind(conn), 'connection');
      Object.defineProperty(conn, '__slowQueryLoggerInstalled', {
        value: true,
        enumerable: false,
      });
    }
    return conn;
  };
}

installSlowQueryLogger(pool);

if (!resolveSlowQueryThresholdMs()) {
  const originalPoolQuery = pool.query.bind(pool);
  pool.query = async function timedPoolQuery(sql, params) {
    const startedAt = Date.now();
    try {
      return await originalPoolQuery(sql, params);
    } finally {
      recordDbDuration(Date.now() - startedAt);
    }
  };

  const originalGetConnection = pool.getConnection.bind(pool);
  pool.getConnection = async function getPerfConnection() {
    const conn = await originalGetConnection();
    if (!conn.__requestPerfLoggerInstalled) {
      const originalConnectionQuery = conn.query.bind(conn);
      conn.query = async function timedConnectionQuery(sql, params) {
        const startedAt = Date.now();
        try {
          return await originalConnectionQuery(sql, params);
        } finally {
          recordDbDuration(Date.now() - startedAt);
        }
      };
      Object.defineProperty(conn, '__requestPerfLoggerInstalled', {
        value: true,
        enumerable: false,
      });
    }
    return conn;
  };
}

module.exports = pool;

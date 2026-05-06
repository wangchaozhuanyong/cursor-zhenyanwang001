const db = require('../../config/db');

function buildRecordWhere(filters = {}, alias = '') {
  const col = (name) => (alias ? `${alias}.${name}` : name);
  const clauses = ['WHERE 1=1'];
  const params = [];
  if (filters.userId) {
    clauses.push(`${col('user_id')} = ?`);
    params.push(filters.userId);
  }
  if (filters.action) {
    clauses.push(`${col('action')} = ?`);
    params.push(filters.action);
  }
  if (filters.keyword) {
    clauses.push(`(${col('order_no')} LIKE ? OR ${col('description')} LIKE ? OR ${col('user_id')} LIKE ?)`);
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  return { where: clauses.join(' AND '), params };
}

async function countRecords(userId, action) {
  const { where, params } = buildRecordWhere({ userId, action });
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM points_records ${where}`, params);
  return total;
}

async function selectRecordsPage(userId, action, pageSize, offset) {
  const { where, params } = buildRecordWhere({ userId, action });
  const [rows] = await db.query(
    `SELECT * FROM points_records ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function countAdminRecords(filters) {
  const { where, params } = buildRecordWhere(filters);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM points_records ${where}`, params);
  return total;
}

async function selectAdminRecordsPage(filters, pageSize, offset) {
  const { where, params } = buildRecordWhere(filters, 'pr');
  const [rows] = await db.query(
    `SELECT pr.*, u.phone AS user_phone, u.nickname AS user_nickname
     FROM points_records pr
     LEFT JOIN users u ON u.id = pr.user_id
     ${where}
     ORDER BY pr.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectAdminStats() {
  const [[row]] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN amount > 0 THEN amount ELSE 0 END), 0) AS totalEarned,
       COALESCE(SUM(CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS totalDeducted,
       COUNT(*) AS totalRecords,
       COUNT(DISTINCT user_id) AS activeUsers
     FROM points_records
     WHERE status = 'success'`,
  );
  return row;
}

async function selectUserPointsBalance(userId) {
  const [[account]] = await db.query('SELECT balance FROM points_accounts WHERE user_id = ?', [userId]);
  if (account) return account.balance ?? 0;
  const [[user]] = await db.query('SELECT points_balance FROM users WHERE id = ?', [userId]);
  return user?.points_balance ?? 0;
}

async function findSignInToday(userId, dateStr) {
  const [[row]] = await db.query(
    `SELECT id FROM points_records WHERE user_id = ? AND action = 'sign_in' AND DATE(created_at) = ?`,
    [userId, dateStr],
  );
  return row || null;
}

async function selectSignInRule() {
  const [[rule]] = await db.query("SELECT points, enabled FROM points_rules WHERE action = 'sign_in' LIMIT 1");
  return rule || null;
}

async function ensureAccount(conn, userId) {
  await conn.query(
    `INSERT IGNORE INTO points_accounts (user_id, balance, total_earned)
     SELECT id, COALESCE(points_balance, 0), GREATEST(COALESCE(points_balance, 0), 0)
     FROM users WHERE id = ?`,
    [userId],
  );
}

async function selectAccountForUpdate(conn, userId) {
  await ensureAccount(conn, userId);
  const [[account]] = await conn.query(
    'SELECT * FROM points_accounts WHERE user_id = ? FOR UPDATE',
    [userId],
  );
  return account || null;
}

async function selectRecordByRelatedForUpdate(conn, relatedRecordId, action) {
  if (!relatedRecordId) return null;
  const [[row]] = await conn.query(
    'SELECT * FROM points_records WHERE related_record_id = ? AND action = ? LIMIT 1 FOR UPDATE',
    [relatedRecordId, action],
  );
  return row || null;
}

async function updateAccountBalance(conn, userId, amount, balanceAfter) {
  const earnedDelta = amount > 0 ? amount : 0;
  const spentDelta = amount < 0 ? Math.abs(amount) : 0;
  const reversedDelta = amount < 0 ? Math.abs(amount) : 0;
  await conn.query(
    `UPDATE points_accounts
     SET balance = ?, total_earned = total_earned + ?, total_spent = total_spent + ?, total_reversed = total_reversed + ?
     WHERE user_id = ?`,
    [balanceAfter, earnedDelta, spentDelta, reversedDelta, userId],
  );
  await conn.query('UPDATE users SET points_balance = ? WHERE id = ?', [balanceAfter, userId]);
}

async function insertLedgerRecord(conn, params) {
  const {
    id,
    userId,
    orderId,
    orderNo,
    action,
    amount,
    balanceBefore,
    balanceAfter,
    description,
    sourceType,
    relatedRecordId,
    status,
    operatorId,
    metadata,
  } = params;
  await conn.query(
    `INSERT INTO points_records
       (id, user_id, order_id, order_no, action, amount, balance_before, balance_after, description, source_type, related_record_id, status, operator_id, metadata)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      userId,
      orderId || null,
      orderNo || '',
      action,
      amount,
      balanceBefore,
      balanceAfter,
      description || '',
      sourceType || 'manual',
      relatedRecordId || null,
      status || 'success',
      operatorId || null,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
}

async function addUserPoints(userId, points) {
  await db.query('UPDATE users SET points_balance = points_balance + ? WHERE id = ?', [points, userId]);
}

module.exports = {
  buildRecordWhere,
  countRecords,
  selectRecordsPage,
  countAdminRecords,
  selectAdminRecordsPage,
  selectAdminStats,
  selectUserPointsBalance,
  findSignInToday,
  selectSignInRule,
  ensureAccount,
  selectAccountForUpdate,
  selectRecordByRelatedForUpdate,
  updateAccountBalance,
  insertLedgerRecord,
  addUserPoints,
};

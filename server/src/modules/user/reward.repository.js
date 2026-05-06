const db = require('../../config/db');
const { REWARD_STATUS } = require('../../constants/status');

function buildRecordWhere(filters = {}, alias = '') {
  const col = (name) => (alias ? `${alias}.${name}` : name);
  const clauses = ['WHERE 1=1'];
  const params = [];
  if (filters.userId) {
    clauses.push(`${col('user_id')} = ?`);
    params.push(filters.userId);
  }
  if (filters.status) {
    clauses.push(`${col('status')} = ?`);
    params.push(filters.status);
  }
  if (filters.keyword) {
    clauses.push(`(${col('order_no')} LIKE ? OR ${col('user_id')} LIKE ?)`);
    params.push(`%${filters.keyword}%`, `%${filters.keyword}%`);
  }
  return { where: clauses.join(' AND '), params };
}

async function countRecords(userId, status) {
  const { where, params } = buildRecordWhere({ userId, status });
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM reward_records ${where}`, params);
  return total;
}

async function countAdminRecords(filters) {
  const { where, params } = buildRecordWhere(filters);
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM reward_records ${where}`, params);
  return total;
}

async function selectAdminRecordsPage(filters, pageSize, offset) {
  const { where, params } = buildRecordWhere(filters, 'rr');
  const [rows] = await db.query(
    `SELECT rr.*, u.phone AS user_phone, u.nickname AS user_nickname
     FROM reward_records rr
     LEFT JOIN users u ON u.id = rr.user_id
     ${where}
     ORDER BY rr.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectAdminStats() {
  const [[result]] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status IN (?,?) THEN amount ELSE 0 END), 0) AS settledAmount,
       COALESCE(SUM(CASE WHEN status = ? THEN amount ELSE 0 END), 0) AS reversedAmount,
       COUNT(*) AS totalRecords,
       COUNT(DISTINCT user_id) AS rewardedUsers
     FROM reward_records`,
    [REWARD_STATUS.APPROVED, REWARD_STATUS.PAID, REWARD_STATUS.REVERSED],
  );
  return result;
}

async function countTransactions(userId, type) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM reward_transactions ${where}`, params);
  return total;
}

async function selectTransactionsPage(userId, type, pageSize, offset) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (type) {
    where += ' AND type = ?';
    params.push(type);
  }
  const [rows] = await db.query(
    `SELECT * FROM reward_transactions ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectAncestorByInviteCode(conn, inviteCode) {
  const [[row]] = await conn.query(
    'SELECT id, parent_invite_code FROM users WHERE invite_code = ?',
    [inviteCode],
  );
  return row || null;
}

async function selectBuyerInviteInfo(conn, userId) {
  const [[row]] = await conn.query(
    'SELECT id, parent_invite_code FROM users WHERE id = ?',
    [userId],
  );
  return row || null;
}

async function selectReferralRulesEnabled(conn) {
  const [rows] = await conn.query('SELECT * FROM referral_rules WHERE enabled = 1 ORDER BY level ASC');
  return rows || [];
}

async function insertSettlementRecord(conn, params) {
  const {
    id,
    userId,
    orderId,
    orderNo,
    orderAmount,
    amount,
    rate,
    level,
    status,
    sourceType,
    remark,
    metadata,
  } = params;
  const [[existing]] = await conn.query(
    `SELECT id FROM reward_records
     WHERE order_id = ? AND user_id = ? AND level = ? AND source_type = ?
     LIMIT 1 FOR UPDATE`,
    [orderId, userId, level, sourceType],
  );
  if (existing) return false;
  const [result] = await conn.query(
    `INSERT INTO reward_records
       (id, user_id, order_id, order_no, order_amount, amount, rate, level, status, source_type, remark, metadata, approved_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW())`,
    [
      id,
      userId,
      orderId,
      orderNo,
      orderAmount,
      amount,
      rate,
      level,
      status,
      sourceType,
      remark || '',
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
  return result.affectedRows > 0;
}

async function insertTransaction(conn, params) {
  const {
    id,
    rewardRecordId,
    userId,
    orderId,
    orderNo,
    type,
    amount,
    status,
    reason,
    operatorId,
    metadata,
  } = params;
  await conn.query(
    `INSERT INTO reward_transactions
       (id, reward_record_id, user_id, order_id, order_no, type, amount, status, reason, operator_id, metadata)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [
      id,
      rewardRecordId || null,
      userId,
      orderId || null,
      orderNo || '',
      type,
      amount,
      status || 'success',
      reason || '',
      operatorId || null,
      metadata ? JSON.stringify(metadata) : null,
    ],
  );
}

async function selectRewardRecordsByOrderForUpdate(conn, orderId) {
  const [rows] = await conn.query(
    `SELECT * FROM reward_records
     WHERE order_id = ? AND status IN (?,?)
     FOR UPDATE`,
    [orderId, REWARD_STATUS.APPROVED, REWARD_STATUS.PAID],
  );
  return rows || [];
}

async function markRewardRecordReversed(conn, rewardRecordId, remark) {
  await conn.query(
    `UPDATE reward_records
     SET status = ?, reversed_at = NOW(), remark = ?
     WHERE id = ?`,
    [REWARD_STATUS.REVERSED, remark || '', rewardRecordId],
  );
}

async function sumUserRewardTransactions(conn, userId) {
  const [[row]] = await conn.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance
     FROM reward_transactions
     WHERE user_id = ? AND (status = 'success' OR (type = 'withdraw_request' AND status = 'pending'))
     FOR UPDATE`,
    [userId],
  );
  return parseFloat(row.balance) || 0;
}

async function selectBalanceSummary(userId) {
  const [[result]] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status = 'success' OR (type = 'withdraw_request' AND status = 'pending') THEN amount ELSE 0 END), 0) AS balance,
       COALESCE(SUM(CASE WHEN type = 'withdraw_request' AND status = 'pending' THEN ABS(amount) ELSE 0 END), 0) AS pendingWithdraw,
       COALESCE(SUM(CASE WHEN type = 'settle' AND status = 'success' THEN amount ELSE 0 END), 0) AS settledAmount,
       COALESCE(SUM(CASE WHEN type = 'reverse' AND status = 'success' THEN ABS(amount) ELSE 0 END), 0) AS reversedAmount
     FROM reward_transactions WHERE user_id = ?`,
    [userId],
  );
  return result;
}

async function countRecordsLegacy(userId, status) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM reward_records ${where}`, params);
  return total;
}

async function selectRecordsPage(userId, status, pageSize, offset) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (status) {
    where += ' AND status = ?';
    params.push(status);
  }
  const [rows] = await db.query(
    `SELECT * FROM reward_records ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function sumAvailableForWithdraw(conn, userId) {
  return sumUserRewardTransactions(conn, userId);
}

async function insertWithdrawRecord(conn, id, userId, amount) {
  await insertTransaction(conn, {
    id,
    userId,
    orderNo: 'WITHDRAW',
    type: 'withdraw_request',
    amount: -amount,
    status: 'pending',
    reason: '用户申请提现',
  });
}

module.exports = {
  countRecords,
  countAdminRecords,
  selectAdminRecordsPage,
  selectAdminStats,
  countTransactions,
  selectTransactionsPage,
  selectBuyerInviteInfo,
  selectAncestorByInviteCode,
  selectReferralRulesEnabled,
  insertSettlementRecord,
  insertTransaction,
  selectRewardRecordsByOrderForUpdate,
  markRewardRecordReversed,
  sumUserRewardTransactions,
  countRecordsLegacy,
  selectRecordsPage,
  sumAvailableForWithdraw,
  insertWithdrawRecord,
  selectBalanceSummary,
};

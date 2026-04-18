const db = require('../../config/db');
const { REWARD_STATUS } = require('../../constants/status');

async function countRecords(userId, status) {
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
  const [[result]] = await conn.query(
    `SELECT COALESCE(SUM(amount), 0) AS balance FROM reward_records
     WHERE user_id = ? AND status IN (?,?,?) FOR UPDATE`,
    [userId, REWARD_STATUS.APPROVED, REWARD_STATUS.PAID, REWARD_STATUS.PENDING],
  );
  return parseFloat(result.balance);
}

async function insertWithdrawRecord(conn, id, userId, amount) {
  await conn.query(
    `INSERT INTO reward_records (id, user_id, order_no, amount, status) VALUES (?,?,?,?,?)`,
    [id, userId, 'WITHDRAW', -amount, REWARD_STATUS.PENDING],
  );
}

async function selectBalanceSummary(userId) {
  const [[result]] = await db.query(
    `SELECT
       COALESCE(SUM(CASE WHEN status IN (?,?) THEN amount ELSE 0 END), 0) AS balance,
       COALESCE(SUM(CASE WHEN status = ? AND amount < 0 THEN ABS(amount) ELSE 0 END), 0) AS pendingWithdraw
     FROM reward_records WHERE user_id = ?`,
    [REWARD_STATUS.APPROVED, REWARD_STATUS.PAID, REWARD_STATUS.PENDING, userId],
  );
  return result;
}

module.exports = {
  countRecords,
  selectRecordsPage,
  sumAvailableForWithdraw,
  insertWithdrawRecord,
  selectBalanceSummary,
};

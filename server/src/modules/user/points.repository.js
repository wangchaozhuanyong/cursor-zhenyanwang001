const db = require('../../config/db');

async function countRecords(userId, action) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (action) {
    where += ' AND action = ?';
    params.push(action);
  }
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM points_records ${where}`, params);
  return total;
}

async function selectRecordsPage(userId, action, pageSize, offset) {
  let where = 'WHERE user_id = ?';
  const params = [userId];
  if (action) {
    where += ' AND action = ?';
    params.push(action);
  }
  const [rows] = await db.query(
    `SELECT * FROM points_records ${where} ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectUserPointsBalance(userId) {
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

async function insertPointsRecord(id, userId, action, amount, description) {
  await db.query(
    `INSERT INTO points_records (id, user_id, action, amount, description) VALUES (?,?,?,?,?)`,
    [id, userId, action, amount, description],
  );
}

async function addUserPoints(userId, points) {
  await db.query('UPDATE users SET points_balance = points_balance + ? WHERE id = ?', [points, userId]);
}

module.exports = {
  countRecords,
  selectRecordsPage,
  selectUserPointsBalance,
  findSignInToday,
  selectSignInRule,
  insertPointsRecord,
  addUserPoints,
};

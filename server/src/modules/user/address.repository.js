const db = require('../../config/db');

async function selectByUser(userId) {
  const [rows] = await db.query(
    'SELECT * FROM addresses WHERE user_id = ? ORDER BY is_default DESC, created_at DESC',
    [userId],
  );
  return rows;
}

async function selectByIdAndUser(id, userId) {
  const [[row]] = await db.query(
    'SELECT id FROM addresses WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return row || null;
}

async function selectWithDefault(id, userId) {
  const [[row]] = await db.query(
    'SELECT id, is_default FROM addresses WHERE id = ? AND user_id = ?',
    [id, userId],
  );
  return row || null;
}

async function deleteById(id) {
  await db.query('DELETE FROM addresses WHERE id = ?', [id]);
}

async function selectLatestRemainingId(userId) {
  const [remaining] = await db.query(
    'SELECT id FROM addresses WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
    [userId],
  );
  return remaining.length > 0 ? remaining[0].id : null;
}

async function setDefaultById(id) {
  await db.query('UPDATE addresses SET is_default = 1 WHERE id = ?', [id]);
}

async function clearDefaultForUser(userId) {
  await db.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
}

async function clearDefaultForUserConn(conn, userId) {
  await conn.query('UPDATE addresses SET is_default = 0 WHERE user_id = ?', [userId]);
}

async function countAddresses(conn, userId) {
  const [countResult] = await conn.query(
    'SELECT COUNT(*) AS cnt FROM addresses WHERE user_id = ?',
    [userId],
  );
  return countResult[0].cnt;
}

async function insertAddress(conn, { id, userId, name, phone, address, isDefault }) {
  await conn.query(
    'INSERT INTO addresses (id, user_id, name, phone, address, is_default) VALUES (?,?,?,?,?,?)',
    [id, userId, name, phone, address, isDefault],
  );
}

async function updateAddressDynamic(conn, id, fields, values) {
  if (fields.length === 0) return;
  values.push(id);
  await conn.query(`UPDATE addresses SET ${fields.join(', ')} WHERE id = ?`, values);
}

async function selectRowById(id) {
  const [[row]] = await db.query('SELECT * FROM addresses WHERE id = ?', [id]);
  return row || null;
}

module.exports = {
  selectByUser,
  selectByIdAndUser,
  selectWithDefault,
  deleteById,
  selectLatestRemainingId,
  setDefaultById,
  clearDefaultForUser,
  clearDefaultForUserConn,
  countAddresses,
  insertAddress,
  updateAddressDynamic,
  selectRowById,
};

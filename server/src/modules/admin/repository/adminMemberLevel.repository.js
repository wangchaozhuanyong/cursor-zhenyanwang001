const db = require('../../../config/db');

function getPool() {
  return db;
}

async function getConnection() {
  return db.getConnection();
}

async function selectLevels(q) {
  const [rows] = await q.query(
    `SELECT id, name, description, min_spent, min_orders, discount_rate, points_multiplier, free_shipping_enabled, sort_order, enabled, is_default, created_at, updated_at
     FROM member_levels
     ORDER BY sort_order ASC, min_spent ASC, min_orders ASC, created_at ASC`,
  );
  return rows;
}

async function selectLevelById(q, id) {
  const [[row]] = await q.query(
    `SELECT id, name, description, min_spent, min_orders, discount_rate, points_multiplier, free_shipping_enabled, sort_order, enabled, is_default, created_at, updated_at
     FROM member_levels WHERE id = ?`,
    [id],
  );
  return row || null;
}

async function countUsersByLevel(q, id) {
  const [[row]] = await q.query('SELECT COUNT(*) AS total FROM users WHERE member_level_id = ?', [id]);
  return Number(row?.total || 0);
}

async function clearDefault(q) {
  await q.query('UPDATE member_levels SET is_default = 0');
}

async function insertLevel(q, params) {
  const {
    id, name, description, minSpent, minOrders, discountRate, pointsMultiplier, freeShippingEnabled, sortOrder, enabled, isDefault,
  } = params;
  await q.query(
    `INSERT INTO member_levels
       (id, name, description, min_spent, min_orders, discount_rate, points_multiplier, free_shipping_enabled, sort_order, enabled, is_default)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, name, description, minSpent, minOrders, discountRate, pointsMultiplier, freeShippingEnabled ? 1 : 0, sortOrder, enabled ? 1 : 0, isDefault ? 1 : 0],
  );
}

async function updateLevel(q, id, params) {
  const {
    name, description, minSpent, minOrders, discountRate, pointsMultiplier, freeShippingEnabled, sortOrder, enabled, isDefault,
  } = params;
  const [result] = await q.query(
    `UPDATE member_levels
     SET name = ?, description = ?, min_spent = ?, min_orders = ?, discount_rate = ?, points_multiplier = ?, free_shipping_enabled = ?, sort_order = ?, enabled = ?, is_default = ?
     WHERE id = ?`,
    [name, description, minSpent, minOrders, discountRate, pointsMultiplier, freeShippingEnabled ? 1 : 0, sortOrder, enabled ? 1 : 0, isDefault ? 1 : 0, id],
  );
  return result.affectedRows > 0;
}

async function deleteLevel(q, id) {
  const [result] = await q.query('DELETE FROM member_levels WHERE id = ?', [id]);
  return result.affectedRows > 0;
}

async function reassignUsersToLevel(q, fromLevelId, toLevelId) {
  await q.query('UPDATE users SET member_level_id = ? WHERE member_level_id = ?', [toLevelId, fromLevelId]);
}

async function selectAllUserIds(q) {
  const [rows] = await q.query('SELECT id FROM users WHERE deleted_at IS NULL');
  return rows.map((r) => r.id);
}

async function updateUserLevelManual(q, userId, levelId) {
  const [r] = await q.query('UPDATE users SET member_level_id = ? WHERE id = ? AND deleted_at IS NULL', [levelId, userId]);
  return (r.affectedRows || 0) > 0;
}

module.exports = {
  getPool,
  getConnection,
  selectLevels,
  selectLevelById,
  countUsersByLevel,
  clearDefault,
  insertLevel,
  updateLevel,
  deleteLevel,
  reassignUsersToLevel,
  selectAllUserIds,
  updateUserLevelManual,
};




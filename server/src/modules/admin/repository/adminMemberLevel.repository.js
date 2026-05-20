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

async function countEnabledLevels(q, excludingId = null) {
  const params = [];
  let where = 'WHERE enabled = 1';
  if (excludingId) {
    where += ' AND id != ?';
    params.push(excludingId);
  }
  const [[row]] = await q.query(`SELECT COUNT(*) AS total FROM member_levels ${where}`, params);
  return Number(row?.total || 0);
}

async function countEnabledDefaultLevels(q, excludingId = null) {
  const params = [];
  let where = 'WHERE enabled = 1 AND is_default = 1';
  if (excludingId) {
    where += ' AND id != ?';
    params.push(excludingId);
  }
  const [[row]] = await q.query(`SELECT COUNT(*) AS total FROM member_levels ${where}`, params);
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
  const [rows] = await q.query(`
    SELECT u.id, u.member_level_manual_locked
    FROM users u
    WHERE u.deleted_at IS NULL
      AND u.role NOT IN ('admin', 'super_admin')
      AND NOT (
        u.role = 'disabled'
        AND EXISTS (SELECT 1 FROM user_roles ur_admin WHERE ur_admin.user_id = u.id)
      )
  `);
  return rows.map((r) => ({ id: r.id, manualLocked: Boolean(r.member_level_manual_locked) }));
}

async function selectUserManualLock(q, userId) {
  const [[row]] = await q.query(
    `SELECT id, member_level_id, member_level_manual_locked, member_level_manual_reason, member_level_manual_at
     FROM users
     WHERE id = ? AND deleted_at IS NULL`,
    [userId],
  );
  return row || null;
}

async function selectAllUserIdsLegacy(q) {
  const [rows] = await q.query('SELECT id FROM users WHERE deleted_at IS NULL');
  return rows.map((r) => r.id);
}

async function updateUserLevelManual(q, userId, levelId, reason) {
  const [r] = await q.query(
    `UPDATE users
     SET member_level_id = ?,
         member_level_manual_locked = 1,
         member_level_manual_reason = ?,
         member_level_manual_at = NOW()
     WHERE id = ? AND deleted_at IS NULL`,
    [levelId, reason || null, userId],
  );
  return (r.affectedRows || 0) > 0;
}

async function unlockUserLevelManual(q, userId) {
  const [r] = await q.query(
    `UPDATE users
     SET member_level_manual_locked = 0,
         member_level_manual_reason = NULL,
         member_level_manual_at = NULL
     WHERE id = ? AND deleted_at IS NULL`,
    [userId],
  );
  return (r.affectedRows || 0) > 0;
}

module.exports = {
  getPool,
  getConnection,
  selectLevels,
  selectLevelById,
  countUsersByLevel,
  countEnabledLevels,
  countEnabledDefaultLevels,
  clearDefault,
  insertLevel,
  updateLevel,
  deleteLevel,
  reassignUsersToLevel,
  selectAllUserIds,
  selectAllUserIdsLegacy,
  selectUserManualLock,
  updateUserLevelManual,
  unlockUserLevelManual,
};




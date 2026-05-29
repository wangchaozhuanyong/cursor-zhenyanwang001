const db = require('../../../config/db');
const { ORDER_STATUS, PAID_PAYMENT_STATUS_LIST } = require('../../../constants/status');

const PAID_PAYMENT_PLACEHOLDERS = PAID_PAYMENT_STATUS_LIST.map(() => '?').join(', ');

function getPool() {
  return db;
}

async function selectEnabledLevels(q) {
  const [rows] = await q.query(
    `SELECT id, name, description, min_spent, min_orders, discount_rate, points_multiplier, free_shipping_enabled, sort_order, enabled, is_default, created_at, updated_at
     FROM member_levels
     WHERE enabled = 1
     ORDER BY sort_order ASC, min_spent ASC, min_orders ASC, created_at ASC`,
  );
  return rows;
}

async function selectAllLevels(q) {
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

async function selectDefaultLevel(q) {
  const [[row]] = await q.query(
    `SELECT id, name, description, min_spent, min_orders, discount_rate, points_multiplier, free_shipping_enabled, sort_order, enabled, is_default, created_at, updated_at
     FROM member_levels
     WHERE enabled = 1
     ORDER BY is_default DESC, sort_order ASC, min_spent ASC, min_orders ASC, created_at ASC
     LIMIT 1`,
  );
  return row || null;
}

async function selectUserCurrentLevel(q, userId) {
  const [[row]] = await q.query(
    `SELECT ml.id, ml.name, ml.description, ml.min_spent, ml.min_orders, ml.discount_rate, ml.points_multiplier, ml.free_shipping_enabled, ml.sort_order, ml.enabled, ml.is_default,
            u.member_level_manual_locked, u.member_level_manual_reason, u.member_level_manual_at
     FROM users u
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     WHERE u.id = ?`,
    [userId],
  );
  return row?.id ? row : null;
}

async function selectUserPaidStats(q, userId) {
  const [[row]] = await q.query(
    `SELECT
        COALESCE(SUM(total_amount), 0) AS total_spent,
        COUNT(*) AS order_count
     FROM orders
     WHERE user_id = ?
       AND payment_status IN (${PAID_PAYMENT_PLACEHOLDERS})
       AND status != ?`,
    [userId, ...PAID_PAYMENT_STATUS_LIST, ORDER_STATUS.CANCELLED],
  );
  return {
    totalSpent: Number(row?.total_spent || 0),
    orderCount: Number(row?.order_count || 0),
  };
}

async function selectMemberBenefitsUser(q, userId) {
  const [[row]] = await q.query(
    `SELECT id, nickname, avatar, points_balance, birthday
     FROM users
     WHERE id = ? AND deleted_at IS NULL`,
    [userId],
  );
  return row || null;
}

async function updateUserMemberLevel(q, userId, levelId) {
  await q.query('UPDATE users SET member_level_id = ? WHERE id = ?', [levelId, userId]);
}

async function updateUserMemberLevelCalculated(q, userId, levelId) {
  await q.query(
    `UPDATE users
     SET member_level_id = ?,
         member_level_manual_locked = 0,
         member_level_manual_reason = NULL,
         member_level_manual_at = NULL
     WHERE id = ?`,
    [levelId, userId],
  );
}

module.exports = {
  getPool,
  selectEnabledLevels,
  selectAllLevels,
  selectLevelById,
  selectDefaultLevel,
  selectUserCurrentLevel,
  selectUserPaidStats,
  selectMemberBenefitsUser,
  updateUserMemberLevel,
  updateUserMemberLevelCalculated,
};


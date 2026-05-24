const db = require('../../../config/db');

function runner(q) {
  return q || db;
}

async function selectGiftItemByIdForUpdate(q, id) {
  const [[row]] = await runner(q).query('SELECT * FROM points_gift_items WHERE id = ? FOR UPDATE', [id]);
  return row || null;
}

async function selectGiftItemById(q, id) {
  const [[row]] = await runner(q).query('SELECT * FROM points_gift_items WHERE id = ?', [id]);
  return row || null;
}

async function selectActiveGiftItems(q) {
  const [rows] = await runner(q).query(
    `SELECT * FROM points_gift_items
     WHERE enabled = 1
       AND (start_at IS NULL OR start_at <= NOW())
       AND (end_at IS NULL OR end_at >= NOW())
     ORDER BY sort_order ASC, created_at DESC`,
  );
  return rows;
}

/**
 * @param {any} q
 * @param {{ page?: number|string; pageSize?: number|string; enabled?: boolean|number|string }} [options]
 */
async function selectGiftItemsPage(q, { page = 1, pageSize = 20, enabled } = {}) {
  const dbRunner = runner(q);
  const where = ['1=1'];
  const params = [];
  if (enabled === '1' || enabled === 1 || enabled === true) {
    where.push('enabled = 1');
  } else if (enabled === '0' || enabled === 0 || enabled === false) {
    where.push('enabled = 0');
  }
  const offset = (Math.max(Number(page) || 1, 1) - 1) * Math.max(Number(pageSize) || 20, 1);
  const limit = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
  const [[{ total }]] = await dbRunner.query(
    `SELECT COUNT(*) AS total FROM points_gift_items WHERE ${where.join(' AND ')}`,
    params,
  );
  const [rows] = await dbRunner.query(
    `SELECT * FROM points_gift_items WHERE ${where.join(' AND ')}
     ORDER BY sort_order ASC, created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return { list: rows, total: Number(total) || 0, page: Number(page) || 1, pageSize: limit };
}

async function insertGiftItem(q, row) {
  await runner(q).query(
    `INSERT INTO points_gift_items
      (id, product_id, variant_id, title, image, required_points, cash_amount,
       stock_limit, redeemed_count, limit_per_user, start_at, end_at, enabled, sort_order)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id, row.product_id, row.variant_id || null, row.title || '', row.image || '',
      Number(row.required_points || 0), Number(row.cash_amount || 0),
      Number(row.stock_limit || 0), 0, Number(row.limit_per_user || 0),
      row.start_at || null, row.end_at || null, row.enabled ? 1 : 0, Number(row.sort_order || 0),
    ],
  );
}

async function updateGiftItem(q, id, fields, values) {
  if (!fields.length) return;
  await runner(q).query(`UPDATE points_gift_items SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
}

async function deleteGiftItem(q, id) {
  await runner(q).query('DELETE FROM points_gift_items WHERE id = ?', [id]);
}

async function incrementGiftRedeemedCount(q, id, qty) {
  const [result] = await runner(q).query(
    `UPDATE points_gift_items
     SET redeemed_count = redeemed_count + ?
     WHERE id = ?
       AND (stock_limit = 0 OR redeemed_count + ? <= stock_limit)`,
    [qty, id, qty],
  );
  return result.affectedRows;
}

async function decrementGiftRedeemedCount(q, id, qty) {
  await runner(q).query(
    'UPDATE points_gift_items SET redeemed_count = GREATEST(0, redeemed_count - ?) WHERE id = ?',
    [qty, id],
  );
}

async function countUserGiftRedemptions(q, userId, giftItemId, { excludeStatuses = ['cancelled'] } = {}) {
  const dbRunner = runner(q);
  const placeholders = excludeStatuses.map(() => '?').join(',');
  const [[row]] = await dbRunner.query(
    `SELECT COALESCE(SUM(quantity), 0) AS total_qty
     FROM points_gift_redemptions
     WHERE user_id = ? AND gift_item_id = ?
       AND status NOT IN (${placeholders})`,
    [userId, giftItemId, ...excludeStatuses],
  );
  return Number(row?.total_qty || 0);
}

async function insertGiftRedemption(q, row) {
  await runner(q).query(
    `INSERT INTO points_gift_redemptions
      (id, user_id, gift_item_id, order_id, order_no, product_id, variant_id, quantity,
       points_used, cash_amount, status, address_snapshot, metadata)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      row.id, row.user_id, row.gift_item_id, row.order_id, row.order_no || '',
      row.product_id, row.variant_id || null, Number(row.quantity || 1),
      Number(row.points_used || 0), Number(row.cash_amount || 0), row.status || 'pending',
      row.address_snapshot ? JSON.stringify(row.address_snapshot) : null,
      row.metadata ? JSON.stringify(row.metadata) : null,
    ],
  );
}

async function updateGiftRedemptionStatus(q, id, status) {
  await runner(q).query('UPDATE points_gift_redemptions SET status = ? WHERE id = ?', [status, id]);
}

async function selectGiftRedemptionByOrderId(q, orderId) {
  const [[row]] = await runner(q).query('SELECT * FROM points_gift_redemptions WHERE order_id = ? LIMIT 1', [orderId]);
  return row || null;
}

/**
 * @param {any} q
 * @param {{ page?: number|string; pageSize?: number|string; userId?: string; giftItemId?: string }} [options]
 */
async function selectGiftRedemptionsPage(q, { page = 1, pageSize = 20, userId, giftItemId } = {}) {
  const dbRunner = runner(q);
  const where = ['1=1'];
  const params = [];
  if (userId) {
    where.push('user_id = ?');
    params.push(userId);
  }
  if (giftItemId) {
    where.push('gift_item_id = ?');
    params.push(giftItemId);
  }
  const limit = Math.min(Math.max(Number(pageSize) || 20, 1), 100);
  const offset = (Math.max(Number(page) || 1, 1) - 1) * limit;
  const [[{ total }]] = await dbRunner.query(
    `SELECT COUNT(*) AS total FROM points_gift_redemptions WHERE ${where.join(' AND ')}`,
    params,
  );
  const [rows] = await dbRunner.query(
    `SELECT * FROM points_gift_redemptions WHERE ${where.join(' AND ')}
     ORDER BY created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset],
  );
  return { list: rows, total: Number(total) || 0, page: Number(page) || 1, pageSize: limit };
}

module.exports = {
  selectGiftItemByIdForUpdate,
  selectGiftItemById,
  selectActiveGiftItems,
  selectGiftItemsPage,
  insertGiftItem,
  updateGiftItem,
  deleteGiftItem,
  incrementGiftRedeemedCount,
  decrementGiftRedeemedCount,
  countUserGiftRedemptions,
  insertGiftRedemption,
  updateGiftRedemptionStatus,
  selectGiftRedemptionByOrderId,
  selectGiftRedemptionsPage,
};

const db = require('../../config/db');
const { ORDER_STATUS } = require('../../constants/status');

function buildUserListWhere(keyword, tagId) {
  let where = 'WHERE 1=1';
  const params = [];
  if (keyword) {
    where += ' AND (nickname LIKE ? OR phone LIKE ?)';
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (tagId) {
    where += ' AND EXISTS (SELECT 1 FROM user_tag_assignments uta WHERE uta.user_id = users.id AND uta.tag_id = ?)';
    params.push(tagId);
  }
  return { where, params };
}

async function getConnection() {
  return db.getConnection();
}

async function countUsers(where, params) {
  const [[{ total }]] = await db.query(`SELECT COUNT(*) AS total FROM users ${where}`, params);
  return total;
}

async function selectUsersPage(where, params, pageSize, offset) {
  const aliasedWhere = where.replace(/users\./g, 'u.');
  const [rows] = await db.query(
    `SELECT u.id, u.phone, u.nickname, u.avatar, u.invite_code, u.parent_invite_code,
            u.points_balance, u.subordinate_enabled, u.wechat, u.whatsapp, u.created_at,
            ml.id AS member_level_id,
            ml.name AS member_level_name,
            ml.description AS member_level_description,
            ml.min_spent AS member_level_min_spent,
            ml.min_orders AS member_level_min_orders
     FROM users u
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     ${aliasedWhere}
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectUsersForExport(where, params) {
  const aliasedWhere = where.replace(/users\./g, 'u.');
  const [rows] = await db.query(
    `SELECT u.id, u.phone, u.nickname, u.avatar, u.invite_code, u.parent_invite_code,
            u.points_balance, u.subordinate_enabled, u.wechat, u.whatsapp, u.created_at,
            ml.name AS member_level_name
     FROM users u
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     ${aliasedWhere}
     ORDER BY u.created_at DESC`,
    params,
  );
  return rows;
}

async function selectTagsForUserIds(userIds) {
  if (!Array.isArray(userIds) || userIds.length === 0) return {};
  const placeholders = userIds.map(() => '?').join(',');
  const [rows] = await db.query(
    `SELECT uta.user_id, ut.id, ut.name, ut.color, ut.description, ut.sort_order
     FROM user_tag_assignments uta
     INNER JOIN user_tags ut ON ut.id = uta.tag_id
     WHERE uta.user_id IN (${placeholders})
     ORDER BY ut.sort_order ASC, ut.created_at DESC`,
    userIds,
  );
  return rows.reduce((acc, row) => {
    if (!acc[row.user_id]) acc[row.user_id] = [];
    acc[row.user_id].push({
      id: row.id,
      name: row.name,
      color: row.color || '金色',
      description: row.description || '',
      sort_order: row.sort_order ?? 0,
    });
    return acc;
  }, {});
}

async function selectUserSummaryById(userId) {
  const [[user]] = await db.query(
    `SELECT u.id, u.phone, u.nickname, u.avatar, u.invite_code, u.parent_invite_code,
            u.points_balance, u.subordinate_enabled, u.wechat, u.whatsapp, u.created_at,
            ml.id AS member_level_id,
            ml.name AS member_level_name,
            ml.description AS member_level_description,
            ml.min_spent AS member_level_min_spent,
            ml.min_orders AS member_level_min_orders
     FROM users u
     LEFT JOIN member_levels ml ON ml.id = u.member_level_id
     WHERE u.id = ?`,
    [userId],
  );
  return user || null;
}

async function countOrdersByUserId(userId) {
  const [[{ orderCount }]] = await db.query(
    `SELECT COUNT(*) AS orderCount
     FROM orders
     WHERE user_id = ? AND payment_status = 'paid' AND status != ?`,
    [userId, ORDER_STATUS.CANCELLED],
  );
  return orderCount;
}

async function sumUserSpentExcludingCancelled(userId) {
  const [[{ totalSpent }]] = await db.query(
    `SELECT COALESCE(SUM(total_amount), 0) AS totalSpent
     FROM orders
     WHERE user_id = ? AND payment_status = 'paid' AND status != ?`,
    [userId, ORDER_STATUS.CANCELLED],
  );
  return totalSpent;
}

async function updateUserDynamic(setFragments, values, userId) {
  await db.query(`UPDATE users SET ${setFragments.join(', ')} WHERE id = ?`, [...values, userId]);
}

async function findPhoneDuplicateByPhones(userId, phones) {
  if (!Array.isArray(phones) || phones.length === 0) return null;
  const placeholders = phones.map(() => '?').join(',');
  const [[row]] = await db.query(
    `SELECT id FROM users WHERE phone IN (${placeholders}) AND id != ? LIMIT 1`,
    [...phones, userId],
  );
  return row || null;
}

async function selectUserTags() {
  const [rows] = await db.query(
    `SELECT ut.id, ut.name, ut.color, ut.description, ut.sort_order, ut.created_at,
            COUNT(uta.user_id) AS user_count
     FROM user_tags ut
     LEFT JOIN user_tag_assignments uta ON uta.tag_id = ut.id
     GROUP BY ut.id, ut.name, ut.color, ut.description, ut.sort_order, ut.created_at
     ORDER BY ut.sort_order ASC, ut.created_at DESC`,
  );
  return rows;
}

async function insertUserTag(tag) {
  await db.query(
    `INSERT INTO user_tags (id, name, color, description, sort_order)
     VALUES (?, ?, ?, ?, ?)`,
    [tag.id, tag.name, tag.color, tag.description, tag.sortOrder],
  );
}

async function updateUserTagDynamic(tagId, setFragments, values) {
  await db.query(`UPDATE user_tags SET ${setFragments.join(', ')} WHERE id = ?`, [...values, tagId]);
}

async function deleteUserTag(tagId) {
  await db.query('DELETE FROM user_tags WHERE id = ?', [tagId]);
}

async function selectExistingTagIds(tagIds) {
  if (!Array.isArray(tagIds) || tagIds.length === 0) return [];
  const placeholders = tagIds.map(() => '?').join(',');
  const [rows] = await db.query(`SELECT id FROM user_tags WHERE id IN (${placeholders})`, tagIds);
  return rows.map((row) => row.id);
}

async function replaceUserTagAssignments(userId, tagIds) {
  const conn = await getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM user_tag_assignments WHERE user_id = ?', [userId]);
    if (tagIds.length > 0) {
      const values = tagIds.map((tagId) => [userId, tagId]);
      await conn.query('INSERT INTO user_tag_assignments (user_id, tag_id) VALUES ?', [values]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function updateSubordinateEnabled(userId, enabled) {
  await db.query('UPDATE users SET subordinate_enabled = ? WHERE id = ?', [enabled ? 1 : 0, userId]);
}

module.exports = {
  getConnection,
  buildUserListWhere,
  countUsers,
  selectUsersPage,
  selectUsersForExport,
  selectTagsForUserIds,
  selectUserSummaryById,
  countOrdersByUserId,
  sumUserSpentExcludingCancelled,
  updateUserDynamic,
  findPhoneDuplicateByPhones,
  selectUserTags,
  insertUserTag,
  updateUserTagDynamic,
  deleteUserTag,
  selectExistingTagIds,
  replaceUserTagAssignments,
  updateSubordinateEnabled,
};

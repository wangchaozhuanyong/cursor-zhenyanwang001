const db = require('../../../config/db');

function buildInviteWhere(query = {}) {
  let where = `WHERE u.parent_invite_code != '' AND u.deleted_at IS NULL`;
  const params = [];
  const keyword = String(query.keyword || '').trim();
  if (keyword) {
    where += ` AND (
      u.nickname LIKE ? OR u.phone LIKE ? OR p.nickname LIKE ? OR p.phone LIKE ? OR u.parent_invite_code LIKE ? OR p.invite_code LIKE ?
    )`;
    const k = `%${keyword}%`;
    params.push(k, k, k, k, k, k);
  }
  if (query.dateFrom) {
    where += ' AND u.created_at >= ?';
    params.push(query.dateFrom);
  }
  if (query.dateTo) {
    where += ' AND u.created_at < DATE_ADD(?, INTERVAL 1 DAY)';
    params.push(query.dateTo);
  }
  return { where, params };
}

async function countUsersWithParentInvite(query = {}) {
  const { where, params } = buildInviteWhere(query);
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM users u LEFT JOIN users p ON u.parent_invite_code = p.invite_code ${where}`,
    params,
  );
  return Number(total || 0);
}

async function selectInviteRowsPage(query = {}, pageSize, offset) {
  const { where, params } = buildInviteWhere(query);
  const [rows] = await db.query(
    `SELECT u.id, u.nickname, u.phone, u.parent_invite_code,
            u.created_at, p.id AS inviter_id, p.nickname AS inviter_nickname, p.phone AS inviter_phone
     FROM users u
     LEFT JOIN users p ON u.parent_invite_code = p.invite_code
     ${where}
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, pageSize, offset],
  );
  return rows;
}

async function selectInviteSummary(query = {}) {
  const { where, params } = buildInviteWhere(query);
  const [[row]] = await db.query(
    `SELECT
      COUNT(*) AS totalRecords,
      COUNT(DISTINCT u.id) AS inviteeUsers,
      COUNT(DISTINCT p.id) AS inviterUsers
     FROM users u
     LEFT JOIN users p ON u.parent_invite_code = p.invite_code
     ${where}`,
    params,
  );
  return {
    totalRecords: Number(row?.totalRecords || 0),
    inviteeUsers: Number(row?.inviteeUsers || 0),
    inviterUsers: Number(row?.inviterUsers || 0),
  };
}

module.exports = {
  countUsersWithParentInvite,
  selectInviteRowsPage,
  selectInviteSummary,
};




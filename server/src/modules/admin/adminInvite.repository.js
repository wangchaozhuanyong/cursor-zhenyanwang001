const db = require('../../config/db');

async function countUsersWithParentInvite() {
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM users WHERE parent_invite_code != ''`,
  );
  return total;
}

async function selectInviteRowsPage(pageSize, offset) {
  const [rows] = await db.query(
    `SELECT u.id, u.nickname, u.phone, u.parent_invite_code,
            u.created_at, p.nickname AS inviter_nickname
     FROM users u
     LEFT JOIN users p ON u.parent_invite_code = p.invite_code
     WHERE u.parent_invite_code != ''
     ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [pageSize, offset],
  );
  return rows;
}

module.exports = {
  countUsersWithParentInvite,
  selectInviteRowsPage,
};

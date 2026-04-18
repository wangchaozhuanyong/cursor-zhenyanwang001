const db = require('../../config/db');

async function selectAdminProfileById(userId) {
  const [[row]] = await db.query(
    'SELECT id, phone, nickname, email, avatar, role, created_at FROM users WHERE id = ?',
    [userId],
  );
  return row || null;
}

async function updateAdminProfileDynamic(setFragments, values, userId) {
  await db.query(`UPDATE users SET ${setFragments.join(', ')} WHERE id = ?`, [...values, userId]);
}

module.exports = {
  selectAdminProfileById,
  updateAdminProfileDynamic,
};

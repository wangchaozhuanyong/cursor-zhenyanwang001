const db = require('../../../config/db');

async function selectAdminProfileById(userId) {
  const [[row]] = await db.query(
    'SELECT id, phone, nickname, email, avatar, role, admin_order_voice_enabled, created_at FROM users WHERE id = ?',
    [userId],
  );
  return row || null;
}

async function selectOrderVoiceEnabled(userId) {
  const [[row]] = await db.query(
    'SELECT admin_order_voice_enabled FROM users WHERE id = ?',
    [userId],
  );
  return row ? Number(row.admin_order_voice_enabled) === 1 : false;
}

async function updateOrderVoiceEnabled(userId, enabled) {
  await db.query(
    'UPDATE users SET admin_order_voice_enabled = ? WHERE id = ?',
    [enabled ? 1 : 0, userId],
  );
}

async function updateAdminProfileDynamic(setFragments, values, userId) {
  await db.query(`UPDATE users SET ${setFragments.join(', ')} WHERE id = ?`, [...values, userId]);
}

module.exports = {
  selectAdminProfileById,
  updateAdminProfileDynamic,
  selectOrderVoiceEnabled,
  updateOrderVoiceEnabled,
};




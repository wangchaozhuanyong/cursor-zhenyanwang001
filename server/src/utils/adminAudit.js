const adminLogRepo = require('../modules/admin/repository/adminLog.repository');
const { generateId } = require('./helpers');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 绠＄悊绔搷浣滄棩蹇楋紙澶辫触鏃堕潤榛橈紝涓嶉樆鏂富娴佺▼锛夈€傝〃缁撴瀯瑙?migrations 涓殑 admin_logs銆?*/
async function logAdminAction(actor, action, detail) {
  try {
    const actorStr = actor != null ? String(actor) : '';
    const isUserId = UUID_RE.test(actorStr);
    await adminLogRepo.insertAdminLogRow({
      id: generateId(),
      adminId: isUserId ? actorStr : null,
      operator: isUserId ? '' : actorStr,
      action,
      detail: detail || '',
    });
  } catch {
    /* best-effort */
  }
}

module.exports = { logAdminAction };


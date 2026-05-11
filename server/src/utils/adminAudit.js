const adminLogRepo = require('../modules/admin/adminLog.repository');
const { generateId } = require('./helpers');

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** 管理端操作日志（失败时静默，不阻断主流程）。表结构见 migrations 中的 admin_logs。 */
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

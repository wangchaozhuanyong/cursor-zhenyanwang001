const auditLogRepo = require('../modules/admin/auditLog.repository');
const { generateId } = require('./helpers');

const MAX_JSON_CHARS = 8000;

/**
 * @param {unknown} obj
 * @returns {string|null}
 */
function truncateJson(obj) {
  if (obj === undefined) return null;
  try {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    if (s.length <= MAX_JSON_CHARS) return s;
    return `${s.slice(0, MAX_JSON_CHARS)}...[truncated]`;
  } catch {
    return '{"_error":"serialize_failed"}';
  }
}

/**
 * @param {import('express').Request} [req]
 */
function getReqContext(req) {
  if (!req || typeof req !== 'object') {
    return { ip: '', userAgent: '', path: '', method: '' };
  }
  const headers = req.headers && typeof req.headers === 'object' ? req.headers : {};
  const xf = headers['x-forwarded-for'];
  const ipRaw = req.ip || (typeof xf === 'string' ? xf.split(',')[0].trim() : '') || req.socket?.remoteAddress || '';
  const ua = String(headers['user-agent'] || '').slice(0, 500);
  return {
    ip: String(ipRaw).slice(0, 45),
    userAgent: ua,
    path: String(req.originalUrl || req.url || '').slice(0, 255),
    method: String(req.method || 'GET').slice(0, 10),
  };
}

/**
 * @param {string} [userId]
 * @returns {Promise<{ name: string; role: string }>}
 */
async function getOperatorMeta(userId) {
  if (!userId) return { name: '', role: '' };
  try {
    const u = await auditLogRepo.selectOperatorDisplayByUserId(userId);
    if (!u) return { name: '', role: '' };
    return { name: u.nickname || '', role: u.role || '' };
  } catch {
    return { name: '', role: '' };
  }
}

/**
 * 写入审计日志（失败时打控制台，不抛错阻断业务）
 * @param {{
 *   req?: import('express').Request;
 *   operatorId?: string|null;
 *   operatorName?: string;
 *   operatorRole?: string;
 *   actionType: string;
 *   objectType?: string;
 *   objectId?: string|null;
 *   summary?: string;
 *   before?: unknown;
 *   after?: unknown;
 *   result: 'success'|'failure';
 *   errorMessage?: string;
 * }} params
 */
async function writeAuditLog(params) {
  const {
    req,
    operatorId,
    operatorName,
    operatorRole,
    actionType,
    objectType,
    objectId,
    summary,
    before,
    after,
    result,
    errorMessage,
  } = params;

  try {
    const ctx = getReqContext(req);
    let name = operatorName ?? '';
    let role = operatorRole ?? '';
    if (operatorId && (!name || !role)) {
      const meta = await getOperatorMeta(operatorId);
      if (!name) name = meta.name;
      if (!role) role = meta.role;
    }

    const id = generateId();
    const beforeStr = before !== undefined ? truncateJson(before) : null;
    const afterStr = after !== undefined ? truncateJson(after) : null;

    await auditLogRepo.insertAuditLogRow({
      id,
      operatorId: operatorId || null,
      operatorName: String(name).slice(0, 100),
      operatorRole: String(role).slice(0, 50),
      actionType: String(actionType).slice(0, 80),
      objectType: String(objectType || '').slice(0, 80),
      objectId: objectId || null,
      summary: String(summary || '').slice(0, 500),
      beforeStr,
      afterStr,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      path: ctx.path,
      method: ctx.method,
      result: result === 'failure' ? 'failure' : 'success',
      errorMessage: String(errorMessage || '').slice(0, 500),
    });
  } catch (e) {
    console.error('[audit_logs] write failed:', e.message);
  }
}

module.exports = {
  writeAuditLog,
  getReqContext,
  getOperatorMeta,
  truncateJson,
};

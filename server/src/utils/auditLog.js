const auditLogRepo = require('../modules/admin/repository/auditLog.repository');
const { generateId } = require('./helpers');
const { getClientIp } = require('./clientIp');

const MAX_JSON_CHARS = 8000;
const MAX_OBJECT_ID_CHARS = 191;
const FRONTEND_CHUNK_LOAD_ACTION_TYPE = 'frontend.chunk_load_failed';
const FRONTEND_CHUNK_LOAD_OBJECT_TYPE = 'frontend_asset';
const FRONTEND_CACHE_INCONSISTENCY_SUMMARY = '前端缓存不一致';
const FRONTEND_CACHE_INCONSISTENCY_ERROR_MESSAGE = '前端版本文件加载失败，通常是旧入口 HTML 引用了已删除的 hashed chunk。请刷新页面或清理 CDN/浏览器 HTML 缓存后再试。';
const FRONTEND_CACHE_INCONSISTENCY_ERROR_PATTERN =
  /Failed to fetch dynamically imported module|Importing a module script failed|Loading chunk [\w.-]+ failed|ChunkLoadError|error loading dynamically imported module|Unable to preload CSS|dynamically imported module|Expected a JavaScript module script|disallowed MIME type|MIME type ["']?text\/html|net::ERR_(?:ABORTED|FAILED)|404(?: \(Not Found\))?.*\/assets\/|\/assets\/[^"'\s)]+\.(?:js|mjs|css)/i;
function isFrontendChunkLoadError(errorMessage) {
  return FRONTEND_CACHE_INCONSISTENCY_ERROR_PATTERN.test(String(errorMessage || ''));
}

function normalizeAuditErrorMessage(errorMessage) {
  const raw = String(errorMessage || '').trim();
  if (!raw) return '';
  if (isFrontendChunkLoadError(raw)) return FRONTEND_CACHE_INCONSISTENCY_ERROR_MESSAGE;
  return raw;
}

/**
 * @param {unknown} obj
 * @returns {string|null}
 */
function truncateJson(obj) {
  if (obj === undefined) return null;
  try {
    const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
    if (s.length <= MAX_JSON_CHARS) return s;
    // Keep a valid JSON string for DB JSON columns when truncation is needed.
    return JSON.stringify({
      _truncated: true,
      _originalLength: s.length,
      preview: s.slice(0, Math.max(0, MAX_JSON_CHARS - 256)),
    });
  } catch {
    return JSON.stringify({ _error: 'serialize_failed' });
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
  const ipRaw = getClientIp(req);
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
 * 鍐欏叆瀹¤鏃ュ織锛堝け璐ユ椂鎵撴帶鍒跺彴锛屼笉鎶涢敊闃绘柇涓氬姟锛? * @param {{
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
 *   result: 'success'|'failure'|'partial';
 *   errorMessage?: string;
 * }} params
 */
async function writeAuditLog(params) {
  if (process.env.AUDIT_LOG_DISABLED === '1') return;

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
    const shouldClassifyAsFrontendChunkLoad = isFrontendChunkLoadError(errorMessage || summary);
    const normalizedErrorMessage = normalizeAuditErrorMessage(errorMessage);
    const normalizedActionType = shouldClassifyAsFrontendChunkLoad
      ? FRONTEND_CHUNK_LOAD_ACTION_TYPE
      : actionType;
    const normalizedObjectType = shouldClassifyAsFrontendChunkLoad
      ? FRONTEND_CHUNK_LOAD_OBJECT_TYPE
      : objectType;
    const normalizedSummary = shouldClassifyAsFrontendChunkLoad && !summary
      ? FRONTEND_CACHE_INCONSISTENCY_SUMMARY
      : summary;

    await auditLogRepo.insertAuditLogRow({
      id,
      operatorId: operatorId || null,
      operatorName: String(name).slice(0, 100),
      operatorRole: String(role).slice(0, 50),
      actionType: String(normalizedActionType).slice(0, 80),
      objectType: String(normalizedObjectType || '').slice(0, 80),
      objectId: objectId == null ? null : String(objectId).slice(0, MAX_OBJECT_ID_CHARS),
      summary: String(normalizedSummary || '').slice(0, 500),
      beforeStr,
      afterStr,
      ip: ctx.ip,
      userAgent: ctx.userAgent,
      path: ctx.path,
      method: ctx.method,
      result: result === 'failure' ? 'failure' : 'success',
      errorMessage: normalizedErrorMessage.slice(0, 500),
    });
  } catch (e) {
    console.error('[audit_logs] write failed:', e.message);
  }
}

module.exports = {
  writeAuditLog,
  getReqContext,
  getOperatorMeta,
  isFrontendChunkLoadError,
  normalizeAuditErrorMessage,
  truncateJson,
};

const net = require('net');
const { BusinessError } = require('../../../errors');
const { generateId } = require('../../../utils/helpers');
const { writeAuditLog } = require('../../../utils/auditLog');
const { resolveIpLocation } = require('../../../utils/ipLocation');
const repo = require('../repository/adminUserSecurity.repository');

const HIGH_SEVERITIES = new Set(['critical', 'high', 'P0', 'P1']);

function paginate(query, defaultPageSize = 20, maxPageSize = 100) {
  const page = Math.max(1, parseInt(query?.page, 10) || 1);
  const pageSize = Math.min(maxPageSize, Math.max(1, parseInt(query?.pageSize, 10) || defaultPageSize));
  return { page, pageSize, offset: (page - 1) * pageSize };
}

function paginateArray(list, page, pageSize) {
  const total = list.length;
  const totalPages = total === 0 ? 0 : Math.ceil(total / pageSize);
  return {
    list: list.slice((page - 1) * pageSize, page * pageSize),
    total,
    page,
    pageSize,
    totalPages,
  };
}

function normalizeText(value, max = 255) {
  return String(value || '').trim().slice(0, max);
}

function normalizeIp(value) {
  const ip = normalizeText(value, 45);
  if (!ip) throw new BusinessError(400, 'IP 不能为空');
  const raw = ip.startsWith('::ffff:') ? ip.slice(7) : ip;
  if (net.isIP(raw) === 0) throw new BusinessError(400, 'IP 格式不正确');
  return ip;
}

function normalizeDeviceId(value) {
  const deviceId = normalizeText(value, 191);
  if (!deviceId) throw new BusinessError(400, '设备标识不能为空');
  if (deviceId.length < 8) throw new BusinessError(400, '设备标识太短');
  return deviceId;
}

function normalizeStatus(value) {
  const status = normalizeText(value, 16);
  return ['blocked', 'watching', 'unblocked'].includes(status) ? status : '';
}

function deriveRiskLevel(item) {
  if (item.status === 'blocked') return 'high';
  const highEvents = Number(item.high_event_count || 0);
  const events = Number(item.event_count || 0);
  const logins = Number(item.login_count || 0);
  const users = Number(item.related_user_count || 0);
  if (highEvents > 0 || users >= 5 || logins >= 20) return 'high';
  if (events >= 3 || users >= 2 || logins >= 5) return 'medium';
  return 'low';
}

function mergeRiskItem(map, key, patch) {
  if (!key) return;
  const old = map.get(key) || {};
  const merged = {
    ...old,
    ...patch,
    login_count: Number(old.login_count || 0) + Number(patch.login_count || 0),
    event_count: Number(old.event_count || 0) + Number(patch.event_count || 0),
    high_event_count: Number(old.high_event_count || 0) + Number(patch.high_event_count || 0),
    related_user_count: Math.max(Number(old.related_user_count || 0), Number(patch.related_user_count || 0)),
  };
  const oldLast = old.last_seen_at ? new Date(old.last_seen_at).getTime() : 0;
  const patchLast = patch.last_seen_at ? new Date(patch.last_seen_at).getTime() : 0;
  if (oldLast && oldLast > patchLast) merged.last_seen_at = old.last_seen_at;
  map.set(key, merged);
}

function mergeRelatedUser(map, row) {
  const userId = normalizeText(row?.user_id, 64);
  if (!userId) return;
  const old = map.get(userId) || {};
  const oldLast = old.last_seen_at ? new Date(old.last_seen_at).getTime() : 0;
  const nextLast = row.last_seen_at ? new Date(row.last_seen_at).getTime() : 0;
  map.set(userId, {
    user_id: userId,
    phone: normalizeText(row.phone, 64) || old.phone || null,
    nickname: normalizeText(row.nickname, 120) || old.nickname || null,
    account_status: normalizeText(row.account_status, 32) || old.account_status || null,
    login_count: Number(old.login_count || 0) + Number(row.login_count || 0),
    event_count: Number(old.event_count || 0) + Number(row.event_count || 0),
    last_seen_at: nextLast >= oldLast ? row.last_seen_at : old.last_seen_at,
  });
}

function sortRelatedUsers(users) {
  return users.sort((a, b) => {
    const lastDiff = new Date(b.last_seen_at || 0).getTime() - new Date(a.last_seen_at || 0).getTime();
    if (lastDiff) return lastDiff;
    return (Number(b.login_count || 0) + Number(b.event_count || 0)) - (Number(a.login_count || 0) + Number(a.event_count || 0));
  });
}

function attachRelatedUsers(rows, relatedRows, keyField) {
  const grouped = new Map();
  relatedRows.forEach((row) => {
    const key = normalizeText(row?.[keyField], keyField === 'ip' ? 45 : 191);
    if (!key) return;
    if (!grouped.has(key)) grouped.set(key, new Map());
    mergeRelatedUser(grouped.get(key), row);
  });

  rows.forEach((row) => {
    const key = normalizeText(row?.[keyField], keyField === 'ip' ? 45 : 191);
    const users = key && grouped.has(key) ? sortRelatedUsers([...grouped.get(key).values()]) : [];
    row.related_users = users.slice(0, 5);
    row.related_user_count = Math.max(Number(row.related_user_count || 0), users.length);
  });
}

function sortRiskRows(rows) {
  return rows.sort((a, b) => {
    const statusScore = (v) => (v === 'blocked' ? 3 : v === 'watching' ? 2 : 1);
    const statusDiff = statusScore(b.status) - statusScore(a.status);
    if (statusDiff) return statusDiff;
    const levelScore = (v) => (v === 'high' ? 3 : v === 'medium' ? 2 : 1);
    const levelDiff = levelScore(b.risk_level) - levelScore(a.risk_level);
    if (levelDiff) return levelDiff;
    return new Date(b.last_seen_at || b.updated_at || 0).getTime() - new Date(a.last_seen_at || a.updated_at || 0).getTime();
  });
}

function withIpLocation(row) {
  if (!row || !row.ip) return row;
  return {
    ...row,
    ip_location: resolveIpLocation(row.ip),
  };
}

function finalRiskRows(rows, keyword, status) {
  const k = normalizeText(keyword, 100).toLowerCase();
  const s = normalizeStatus(status);
  return sortRiskRows(rows
    .map((row) => withIpLocation({ ...row, risk_level: row.risk_level || deriveRiskLevel(row) }))
    .filter((row) => (!s || row.status === s))
    .filter((row) => {
      if (!k) return true;
      return [
        row.ip,
        row.device_id,
        row.device_label,
        row.reason,
        row.status,
        row.risk_level,
        row.ip_location?.label,
        row.ip_location?.country,
        row.ip_location?.country_code,
        row.ip_location?.region,
        row.ip_location?.city,
        ...(row.related_users || []).flatMap((user) => [
          user.user_id,
          user.phone,
          user.nickname,
          user.account_status,
        ]),
      ]
        .some((v) => String(v || '').toLowerCase().includes(k));
    }));
}

async function overview() {
  const [
    login24h,
    events24h,
    blockedIpCount,
    blockedDeviceCount,
    recentEvents,
    topRiskIps,
    topRiskDevices,
  ] = await Promise.all([
    repo.countLoginAttemptsSince(24),
    repo.countSecurityEventsSince(24),
    repo.countBlockedIps(),
    repo.countBlockedDevices(),
    listSecurityEvents({ page: 1, pageSize: 5 }),
    listRiskIps({ page: 1, pageSize: 5 }),
    listRiskDevices({ page: 1, pageSize: 5 }),
  ]);

  return {
    data: {
      loginAttemptCount24h: login24h.total,
      uniqueLoginUsers24h: login24h.users,
      securityEventCount24h: events24h.total,
      highRiskEventCount24h: events24h.highRisk,
      blockedIpCount,
      blockedDeviceCount,
      recentEvents: recentEvents.list,
      topRiskIps: topRiskIps.list,
      topRiskDevices: topRiskDevices.list,
    },
  };
}

async function isUserSecurityIpBlocked(ip) {
  return repo.isIpBlocked(ip);
}

async function isUserSecurityDeviceBlocked(deviceId) {
  return repo.isDeviceBlocked(deviceId);
}

async function insertUserSecurityEvent(event) {
  return repo.insertSecurityEvent(event);
}

async function listLoginAttempts(query = {}) {
  const { page, pageSize, offset } = paginate(query);
  const filters = {
    keyword: normalizeText(query.keyword, 100),
    userId: normalizeText(query.userId || query.user_id, 64),
    ip: normalizeText(query.ip, 45),
    deviceId: normalizeText(query.deviceId || query.device_id, 191),
    loginMethod: normalizeText(query.loginMethod || query.login_method, 32),
    dateFrom: normalizeText(query.dateFrom || query.date_from, 20),
    dateTo: normalizeText(query.dateTo || query.date_to, 20),
  };
  const [total, list] = await Promise.all([
    repo.countLoginAttempts(filters),
    repo.selectLoginAttempts(filters, pageSize, offset),
  ]);
  return { list: list.map(withIpLocation), total, page, pageSize, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) };
}

async function listSecurityEvents(query = {}) {
  const { page, pageSize, offset } = paginate(query);
  const filters = {
    keyword: normalizeText(query.keyword, 100),
    userId: normalizeText(query.userId || query.user_id, 64),
    ip: normalizeText(query.ip, 45),
    deviceId: normalizeText(query.deviceId || query.device_id, 191),
    eventType: normalizeText(query.eventType || query.event_type, 64),
    severity: normalizeText(query.severity, 16),
    dateFrom: normalizeText(query.dateFrom || query.date_from, 20),
    dateTo: normalizeText(query.dateTo || query.date_to, 20),
  };
  const [total, list] = await Promise.all([
    repo.countSecurityEvents(filters),
    repo.selectSecurityEvents(filters, pageSize, offset),
  ]);
  return { list: list.map(withIpLocation), total, page, pageSize, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) };
}

async function listRiskIps(query = {}) {
  const { page, pageSize } = paginate(query);
  const sinceDays = Math.min(365, Math.max(1, parseInt(query.sinceDays, 10) || 30));
  const [manual, loginSignals, eventSignals] = await Promise.all([
    repo.selectManualRiskIps(),
    repo.selectRiskIpSignals(sinceDays, 300),
    repo.selectRiskIpEventSignals(sinceDays, 300),
  ]);
  const map = new Map();

  loginSignals.forEach((row) => {
    mergeRiskItem(map, row.ip, {
      ip: row.ip,
      status: 'watching',
      risk_level: '',
      reason: '登录行为触发观察',
      login_count: row.login_count,
      related_user_count: row.related_user_count,
      last_seen_at: row.last_seen_at,
      source: 'signal',
    });
  });
  eventSignals.forEach((row) => {
    mergeRiskItem(map, row.ip, {
      ip: row.ip,
      status: 'watching',
      risk_level: '',
      reason: '安全事件触发观察',
      event_count: row.event_count,
      high_event_count: row.high_event_count,
      last_seen_at: row.last_event_at,
      source: 'event',
    });
  });
  manual.forEach((row) => {
    mergeRiskItem(map, row.ip, {
      ...row,
      login_count: 0,
      event_count: 0,
      high_event_count: 0,
      source: 'manual',
    });
  });

  const rawRows = [...map.values()];
  const relatedRows = await repo.selectRiskIpRelatedUsers(
    rawRows.map((row) => row.ip).filter(Boolean),
    sinceDays,
    Math.min(5000, Math.max(200, rawRows.length * 20)),
  );
  attachRelatedUsers(rawRows, relatedRows, 'ip');
  const rows = finalRiskRows(rawRows, query.keyword, query.status);
  return paginateArray(rows, page, pageSize);
}

async function listRiskDevices(query = {}) {
  const { page, pageSize } = paginate(query);
  const sinceDays = Math.min(365, Math.max(1, parseInt(query.sinceDays, 10) || 30));
  const [manual, loginSignals, eventSignals] = await Promise.all([
    repo.selectManualRiskDevices(),
    repo.selectRiskDeviceSignals(sinceDays, 300),
    repo.selectRiskDeviceEventSignals(sinceDays, 300),
  ]);
  const map = new Map();

  loginSignals.forEach((row) => {
    mergeRiskItem(map, row.device_id, {
      device_id: row.device_id,
      device_label: row.device_id ? `UA-${String(row.device_id).slice(0, 10)}` : '',
      status: 'watching',
      risk_level: '',
      reason: '登录设备触发观察',
      login_count: row.login_count,
      related_user_count: row.related_user_count,
      last_seen_at: row.last_seen_at,
      source: 'signal',
    });
  });
  eventSignals.forEach((row) => {
    mergeRiskItem(map, row.device_id, {
      device_id: row.device_id,
      device_label: row.device_id ? `UA-${String(row.device_id).slice(0, 10)}` : '',
      status: 'watching',
      risk_level: '',
      reason: '安全事件触发观察',
      event_count: row.event_count,
      high_event_count: row.high_event_count,
      last_seen_at: row.last_event_at,
      source: 'event',
    });
  });
  manual.forEach((row) => {
    mergeRiskItem(map, row.device_id, {
      ...row,
      login_count: 0,
      event_count: 0,
      high_event_count: 0,
      source: 'manual',
    });
  });

  const rawRows = [...map.values()];
  const relatedRows = await repo.selectRiskDeviceRelatedUsers(
    rawRows.map((row) => row.device_id).filter(Boolean),
    sinceDays,
    Math.min(5000, Math.max(200, rawRows.length * 20)),
  );
  attachRelatedUsers(rawRows, relatedRows, 'device_id');
  const rows = finalRiskRows(rawRows, query.keyword, query.status);
  return paginateArray(rows, page, pageSize);
}

async function blockIp(body, adminUserId, req) {
  const ip = normalizeIp(body?.ip);
  const reason = normalizeText(body?.reason, 255) || '管理员手动封禁风险 IP';
  const riskLevel = normalizeText(body?.riskLevel || body?.risk_level, 16) || 'high';
  const before = await repo.selectRiskIp(ip);
  await repo.upsertBlockedIp({
    id: generateId(),
    ip,
    riskLevel,
    reason,
    adminUserId,
    failedCount: Number(body?.failedCount || body?.failed_count || 0) || 0,
    relatedUserCount: Number(body?.relatedUserCount || body?.related_user_count || 0) || 0,
    lastSeenAt: body?.lastSeenAt || body?.last_seen_at || null,
  });
  const after = await repo.selectRiskIp(ip);
  await repo.insertSecurityEvent({
    id: generateId(),
    eventType: 'risk_ip_blocked',
    severity: 'high',
    title: '封禁风险 IP',
    description: reason,
    ip,
    metadata: { adminUserId },
  });
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user_security.ip_block',
    objectType: 'risk_ip',
    objectId: ip,
    summary: `封禁风险 IP ${ip}`,
    before,
    after,
    result: 'success',
  });
  return { data: withIpLocation(after), message: '风险 IP 已封禁' };
}

async function unblockIp(body, adminUserId, req) {
  const ip = normalizeIp(body?.ip);
  const reason = normalizeText(body?.reason, 255) || '管理员手动解封风险 IP';
  const before = await repo.selectRiskIp(ip);
  if (!before) throw new BusinessError(404, '风险 IP 不存在');
  await repo.unblockIp(ip, adminUserId, reason);
  const after = await repo.selectRiskIp(ip);
  await repo.insertSecurityEvent({
    id: generateId(),
    eventType: 'risk_ip_unblocked',
    severity: 'info',
    title: '解封风险 IP',
    description: reason,
    ip,
    metadata: { adminUserId },
  });
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user_security.ip_unblock',
    objectType: 'risk_ip',
    objectId: ip,
    summary: `解封风险 IP ${ip}`,
    before,
    after,
    result: 'success',
  });
  return { data: withIpLocation(after), message: '风险 IP 已解封' };
}

async function blockDevice(body, adminUserId, req) {
  const deviceId = normalizeDeviceId(body?.deviceId || body?.device_id);
  const deviceLabel = normalizeText(body?.deviceLabel || body?.device_label, 191);
  const reason = normalizeText(body?.reason, 255) || '管理员手动封禁风险设备';
  const riskLevel = normalizeText(body?.riskLevel || body?.risk_level, 16) || 'high';
  const before = await repo.selectRiskDevice(deviceId);
  await repo.upsertBlockedDevice({
    id: generateId(),
    deviceId,
    deviceLabel,
    riskLevel,
    reason,
    adminUserId,
    relatedUserCount: Number(body?.relatedUserCount || body?.related_user_count || 0) || 0,
    lastSeenAt: body?.lastSeenAt || body?.last_seen_at || null,
  });
  const after = await repo.selectRiskDevice(deviceId);
  await repo.insertSecurityEvent({
    id: generateId(),
    eventType: 'risk_device_blocked',
    severity: 'high',
    title: '封禁风险设备',
    description: reason,
    deviceId,
    metadata: { adminUserId, deviceLabel },
  });
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user_security.device_block',
    objectType: 'risk_device',
    objectId: deviceId,
    summary: `封禁风险设备 ${deviceLabel || deviceId}`,
    before,
    after,
    result: 'success',
  });
  return { data: after, message: '风险设备已封禁' };
}

async function unblockDevice(body, adminUserId, req) {
  const deviceId = normalizeDeviceId(body?.deviceId || body?.device_id);
  const reason = normalizeText(body?.reason, 255) || '管理员手动解封风险设备';
  const before = await repo.selectRiskDevice(deviceId);
  if (!before) throw new BusinessError(404, '风险设备不存在');
  await repo.unblockDevice(deviceId, adminUserId, reason);
  const after = await repo.selectRiskDevice(deviceId);
  await repo.insertSecurityEvent({
    id: generateId(),
    eventType: 'risk_device_unblocked',
    severity: 'info',
    title: '解封风险设备',
    description: reason,
    deviceId,
    metadata: { adminUserId },
  });
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user_security.device_unblock',
    objectType: 'risk_device',
    objectId: deviceId,
    summary: `解封风险设备 ${deviceId}`,
    before,
    after,
    result: 'success',
  });
  return { data: after, message: '风险设备已解封' };
}

async function listUserSessions(userId, query = {}) {
  const uid = normalizeText(userId, 64);
  if (!uid) throw new BusinessError(400, '用户 ID 不能为空');
  const { page, pageSize, offset } = paginate(query);
  const [total, list] = await Promise.all([
    repo.countUserRecentLoginSessions(uid),
    repo.selectUserRecentLoginSessions(uid, pageSize, offset),
  ]);
  return { list: list.map(withIpLocation), total, page, pageSize, totalPages: total === 0 ? 0 : Math.ceil(total / pageSize) };
}

async function revokeUserSessions(userId, body, adminUserId, req) {
  const uid = normalizeText(userId, 64);
  if (!uid) throw new BusinessError(400, '用户 ID 不能为空');
  const reason = normalizeText(body?.reason, 255) || '管理员撤销用户登录状态';
  const affected = await repo.bumpUserRefreshTokenVersion(uid);
  if (!affected) throw new BusinessError(404, '用户不存在');
  await repo.insertSecurityEvent({
    id: generateId(),
    userId: uid,
    eventType: 'user_sessions_revoked',
    severity: 'medium',
    title: '撤销用户登录状态',
    description: reason,
    metadata: { adminUserId },
  });
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user_security.sessions_revoke',
    objectType: 'user',
    objectId: uid,
    summary: `撤销用户登录状态 ${uid}`,
    after: { reason },
    result: 'success',
  });
  return { data: { affected: 1 }, message: '用户登录状态已撤销' };
}

async function unprotectUser(userId, body, adminUserId, req) {
  const uid = normalizeText(userId, 64);
  if (!uid) throw new BusinessError(400, '用户 ID 不能为空');
  const reason = normalizeText(body?.reason, 255) || '管理员解除用户保护';
  const before = await repo.selectUserProtection(uid);
  if (!before) throw new BusinessError(404, '用户不存在');
  await repo.clearUserProtection(uid);
  const after = await repo.selectUserProtection(uid);
  await repo.insertSecurityEvent({
    id: generateId(),
    userId: uid,
    eventType: 'user_unprotected',
    severity: 'info',
    title: '解除用户保护',
    description: reason,
    metadata: { adminUserId },
  });
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user_security.user_unprotect',
    objectType: 'user',
    objectId: uid,
    summary: `解除用户保护 ${uid}`,
    before,
    after,
    result: 'success',
  });
  return { data: after, message: '用户保护已解除' };
}

module.exports = {
  overview,
  listLoginAttempts,
  listSecurityEvents,
  listRiskIps,
  blockIp,
  unblockIp,
  listRiskDevices,
  blockDevice,
  unblockDevice,
  listUserSessions,
  revokeUserSessions,
  unprotectUser,
  isUserSecurityIpBlocked,
  isUserSecurityDeviceBlocked,
  insertUserSecurityEvent,
  HIGH_SEVERITIES,
};

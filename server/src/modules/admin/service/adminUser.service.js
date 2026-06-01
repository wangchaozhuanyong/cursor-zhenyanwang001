const { BusinessError } = require('../../../errors/BusinessError');
const { rowsToCsvLocalized } = require('../../../utils/adminCsvLabels');
const repo = require('../repository/adminUser.repository');
const auditRepo = require('../repository/auditLog.repository');
const { writeAuditLog } = require('../../../utils/auditLog');
const { formatUserResponse } = require('../../../utils/formatUserResponse');
const { normalizeIntlPhone, buildPhoneLookupCandidates } = require('../../../utils/phone');
const { generateId, parseBool } = require('../../../utils/helpers');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

function getUserApi() {
  return /** @type {any} */ (require('../../user')).api || {};
}

function requireAdjustUserPoints() {
  const fn = getUserApi().adjustUserPoints;
  if (typeof fn !== 'function') throw new Error('User module api.adjustUserPoints is required');
  return fn;
}

const ADMIN_USER_MESSAGE = '管理员账号请到“员工账号 / 角色权限”模块管理。';

function isAdminAccountRow(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  return user.role === 'disabled' && Boolean(user.has_rbac_role);
}

async function assertTargetIsNormalUser(userId, preloadedUser = null) {
  const user = preloadedUser || await repo.selectUserSummaryById(userId);
  if (!user) throw new BusinessError(404, '用户不存在');
  if (isAdminAccountRow(user)) throw new BusinessError(403, ADMIN_USER_MESSAGE);
  if (user.role === 'disabled') {
    const protectedIds = await repo.selectProtectedAdminUserIds([userId]);
    if (protectedIds.length) throw new BusinessError(403, ADMIN_USER_MESSAGE);
  }
  return user;
}

async function assertBatchTargetsAreNormalUsers(userIds) {
  const protectedIds = await repo.selectProtectedAdminUserIds(userIds);
  if (protectedIds.length) throw new BusinessError(403, ADMIN_USER_MESSAGE);
}

async function listUsers(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const {
    keyword, tagId, wechatBound, phoneBound, memberLevelId, accountStatus, dateFrom, dateTo,
    totalSpentMin, totalSpentMax, orderCountMin, orderCountMax, pointsMin, pointsMax, refundRateMin, refundRateMax,
    orderRestricted, couponRestricted, commentRestricted,
  } = query;
  const sortByRaw = String(query.sortBy || query.sort_by || '').trim();
  const sortDirRaw = String(query.sortDir || query.sort_dir || '').trim().toLowerCase();
  const sortDir = sortDirRaw === 'asc' ? 'ASC' : 'DESC';

  const sortKeyToSql = {
    created_at: 'u.created_at',
    total_spent: 'COALESCE(us.total_spent, 0)',
    valid_order_count: 'COALESCE(us.valid_order_count, 0)',
    average_order_value: 'COALESCE(us.average_order_value, 0)',
    last_purchase_at: 'us.last_purchase_at',
    first_purchase_at: 'us.first_purchase_at',
    refund_rate: 'COALESCE(us.refund_rate, 0)',
  };
  const sortExpr = sortKeyToSql[sortByRaw] || 'u.created_at';
  const sortSql = `${sortExpr} ${sortDir}, u.created_at DESC`;

  const { where, params } = repo.buildUserListWhere(keyword, tagId, {
    wechatBound, phoneBound, memberLevelId, accountStatus, dateFrom, dateTo,
    totalSpentMin, totalSpentMax, orderCountMin, orderCountMax, pointsMin, pointsMax, refundRateMin, refundRateMax,
    orderRestricted, couponRestricted, commentRestricted,
  });
  const includeSummary = parseBool(query.includeSummary ?? query.include_summary) !== false;
  const offset = (page - 1) * pageSize;
  const [total, summary, list] = await Promise.all([
    repo.countUsers(where, params),
    includeSummary ? repo.selectUserSummaryMetrics(where, params) : Promise.resolve({}),
    repo.selectUsersPage(where, params, pageSize, offset, { sortSql }),
  ]);
  const tagsByUserId = await repo.selectTagsForUserIds(list.map((u) => u.id));
  return {
    kind: 'paginate',
    list: list.map((u) => formatUserResponse({ ...u, tags: tagsByUserId[u.id] || [] }, 'admin')),
    total,
    page,
    pageSize,
    summary,
  };
}

async function getUserById(userId) {
  const user = await assertTargetIsNormalUser(userId);
  const orderCount = await repo.countOrdersByUserId(userId);
  const totalSpentRaw = await repo.sumUserSpentExcludingCancelled(userId);
  const tagsByUserId = await repo.selectTagsForUserIds([userId]);
  user.orderCount = orderCount;
  user.totalSpent = parseFloat(totalSpentRaw);
  user.tags = tagsByUserId[userId] || [];
  const wechatIdentity = await repo.selectWechatIdentityByUserId(userId);
  user.wechat_auth = wechatIdentity
    ? {
      bound: true,
      nickname: wechatIdentity.nickname || null,
      avatar_url: wechatIdentity.avatar_url || null,
      openid: wechatIdentity.provider_openid,
      unionid: wechatIdentity.provider_unionid || null,
      appid: wechatIdentity.appid || null,
      bound_at: wechatIdentity.bound_at,
    }
    : { bound: false };
  user.related = await repo.selectUserDetailRelations(userId);
  user.status_overview = await buildStatusOverview(userId, user);
  const { where, params } = auditRepo.buildWhere({ objectType: 'user', objectId: userId });
  user.operation_logs = await auditRepo.selectAuditLogsPage(where, params, 'ORDER BY created_at DESC', 30, 0);
  return { data: formatUserResponse(user, 'admin') };
}

async function buildStatusOverview(userId, baseUser) {
  const restrictions = await repo.selectUserRestrictions(userId);
  const latest = await repo.selectLatestStatusAuditLog(userId);
  return {
    account_status: baseUser?.account_status || 'normal',
    restrictions: {
      order_restricted: !!restrictions.order_restricted,
      coupon_restricted: !!restrictions.coupon_restricted,
      comment_restricted: !!restrictions.comment_restricted,
    },
    latest_status_action: latest ? {
      operator_id: latest.operator_id || null,
      operator_name: latest.operator_name || '',
      summary: latest.summary || '',
      after_json: latest.after_json || null,
      created_at: latest.created_at || null,
    } : null,
  };
}

async function adminUnbindWechat(userId, adminUserId, req) {
  const user = await assertTargetIsNormalUser(userId);
  const identity = await repo.selectWechatIdentityByUserId(userId);
  if (!identity) throw new BusinessError(400, '该用户未绑定微信');
  const hasPhone = Boolean(user.phone && String(user.phone).trim());
  const hasPassword = Boolean(user.password_hash && String(user.password_hash).trim());
  if (!hasPhone && !hasPassword) {
    throw new BusinessError(400, '该用户无手机号或密码登录方式，不允许解绑微信');
  }
  await repo.deleteWechatIdentityByUserId(userId);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'user.unbind_wechat', objectType: 'user', objectId: userId, summary: `解绑微信 ${user.phone || userId}`, result: 'success' });
  return { data: null, message: '微信已解绑' };
}

function normalizeTagInput(body) {
  const name = body.name == null ? undefined : String(body.name).trim();
  const color = body.color == null || !String(body.color).trim() ? '金色' : String(body.color).trim().slice(0, 20);
  const description = body.description == null ? '' : String(body.description).trim().slice(0, 255);
  const sortOrder = Number.isFinite(Number(body.sort_order ?? body.sortOrder)) ? Number(body.sort_order ?? body.sortOrder) : 0;
  return { name, color, description, sortOrder };
}

async function listUserTags() {
  const rows = await repo.selectUserTags();
  return { data: rows.map((row) => ({ id: row.id, name: row.name, color: row.color || '金色', description: row.description || '', sort_order: row.sort_order ?? 0, count: Number(row.user_count) || 0 })) };
}

async function createUserTag(body, adminUserId, req) {
  const tag = normalizeTagInput(body || {});
  if (!tag.name) throw new BusinessError(400, '标签名称必填');
  if (tag.name.length > 50) throw new BusinessError(400, '标签名称不能超过 50 个字符');
  const id = generateId();
  try { await repo.insertUserTag({ id, ...tag }); } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new BusinessError(400, '标签已存在');
    throw err;
  }
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'user_tag.create', objectType: 'user_tag', objectId: id, summary: `创建用户标签 ${tag.name}`, after: tag, result: 'success' });
  return { data: { id, name: tag.name, color: tag.color, description: tag.description, sort_order: tag.sortOrder, count: 0 }, message: '创建成功' };
}

async function updateUserTag(tagId, body, adminUserId, req) {
  const fields = [];
  const values = [];
  if (body.name !== undefined) { const name = String(body.name).trim(); if (!name) throw new BusinessError(400, '标签名称必填'); if (name.length > 50) throw new BusinessError(400, '标签名称不能超过 50 个字符'); fields.push('name = ?'); values.push(name); }
  if (body.color !== undefined) { fields.push('color = ?'); values.push(String(body.color || '金色').trim().slice(0, 20) || '金色'); }
  if (body.description !== undefined) { fields.push('description = ?'); values.push(String(body.description || '').trim().slice(0, 255)); }
  if (body.sort_order !== undefined || body.sortOrder !== undefined) { const sortOrder = Number(body.sort_order ?? body.sortOrder); fields.push('sort_order = ?'); values.push(Number.isFinite(sortOrder) ? sortOrder : 0); }
  if (fields.length === 0) throw new BusinessError(400, '没有需要更新的字段');
  try { await repo.updateUserTagDynamic(tagId, fields, values); } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new BusinessError(400, '标签已存在');
    throw err;
  }
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'user_tag.update', objectType: 'user_tag', objectId: tagId, summary: `更新用户标签 ${tagId}`, after: body, result: 'success' });
  return { data: null, message: '更新成功' };
}

async function deleteUserTag(tagId, adminUserId, req) {
  const affectedUsers = await repo.countUsersByTagId(tagId);
  await repo.deleteUserTag(tagId);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'user_tag.delete', objectType: 'user_tag', objectId: tagId, summary: `删除用户标签 ${tagId}`, after: { affectedUsers }, result: 'success' });
  return { data: null, message: '已删除' };
}

async function getUserTagImpact(tagId) {
  const affectedUsers = await repo.countUsersByTagId(tagId);
  return { data: { affectedUsers } };
}

async function setUserTags(userId, body, adminUserId, req) {
  await assertTargetIsNormalUser(userId);
  const rawTagIds = Array.isArray(body.tagIds) ? body.tagIds : body.tag_ids;
  if (!Array.isArray(rawTagIds)) throw new BusinessError(400, '请选择标签');
  const tagIds = [...new Set(rawTagIds.map((id) => String(id).trim()).filter(Boolean))];
  const existingTagIds = await repo.selectExistingTagIds(tagIds);
  if (existingTagIds.length !== tagIds.length) throw new BusinessError(400, '存在无效标签');
  await repo.replaceUserTagAssignments(userId, tagIds);
  const tagsByUserId = await repo.selectTagsForUserIds([userId]);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'user.tags_update', objectType: 'user', objectId: userId, summary: `更新用户标签 ${userId}`, after: { tagIds }, result: 'success' });
  return { data: tagsByUserId[userId] || [], message: '标签已更新' };
}

async function batchSetUserTag(body, adminUserId, req) {
  const tagId = String(body?.tagId || body?.tag_id || '').trim();
  const userIds = Array.isArray(body?.userIds) ? body.userIds.map((x) => String(x).trim()).filter(Boolean) : [];
  if (!tagId) throw new BusinessError(400, 'tagId必填');
  if (!userIds.length) throw new BusinessError(400, 'userIds不能为空');
  await assertBatchTargetsAreNormalUsers(userIds);
  const existingTagIds = await repo.selectExistingTagIds([tagId]);
  if (!existingTagIds.length) throw new BusinessError(400, '标签不存在');
  const affected = await repo.batchAssignTag(userIds, tagId);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user.tags_batch_assign',
    objectType: 'user_tag',
    objectId: tagId,
    summary: `批量打标签 ${tagId}`,
    after: { userCount: userIds.length, affected },
    result: 'success',
  });
  return { data: { affected }, message: '批量打标成功' };
}

function normalizeAdminBirthday(value) {
  if (value === null || value === '' || value === undefined) return null;
  const s = String(value).trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) throw new BusinessError(400, '生日格式应为 YYYY-MM-DD');
  return s;
}

function normalizeStoredBirthday(value) {
  if (value === null || value === undefined || value === '') return null;
  const s = String(value).trim().slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}

async function updateUser(userId, body, adminUserId, req) {
  const beforeUser = await assertTargetIsNormalUser(userId);
  const fields = [];
  const values = [];
  for (const f of ['nickname', 'avatar', 'wechat', 'whatsapp']) {
    if (body[f] !== undefined) { fields.push(`${f} = ?`); values.push(body[f]); }
  }
  if (body.birthday !== undefined) {
    const normalizedBirthday = normalizeAdminBirthday(body.birthday);
    fields.push('birthday = ?');
    values.push(normalizedBirthday);
    fields.push('birthday_updated_at = NOW()');
    if (!normalizedBirthday) {
      fields.push('birthday_locked = ?');
      values.push(0);
    }
  }
  if (body.birthday_locked !== undefined || body.birthdayLocked !== undefined) {
    const locked = !!(body.birthday_locked ?? body.birthdayLocked);
    if (locked) {
      const effectiveBirthday = body.birthday !== undefined
        ? normalizeAdminBirthday(body.birthday)
        : normalizeStoredBirthday(beforeUser?.birthday);
      if (!effectiveBirthday) {
        throw new BusinessError(400, '请先填写有效生日后再锁定');
      }
    }
    fields.push('birthday_locked = ?');
    values.push(locked ? 1 : 0);
  }
  if (body.phone !== undefined) {
    const normalizedPhone = normalizeIntlPhone(body.phone, body.countryCode);
    if (!normalizedPhone || !/^\+(60|86)\d+$/.test(normalizedPhone)) throw new BusinessError(400, '仅支持 +60/+86 手机号');
    const dup = await repo.findPhoneDuplicateByPhones(userId, buildPhoneLookupCandidates(body.phone, body.countryCode));
    if (dup) throw new BusinessError(409, '该手机号已被其他用户使用');
    fields.push('phone = ?');
    values.push(normalizedPhone);
  }
  if (fields.length === 0) throw new BusinessError(400, '没有需要更新的字段');
  await repo.updateUserDynamic(fields, values, userId);
  const afterUser = await repo.selectUserSummaryById(userId);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'user.profile_update', objectType: 'user', objectId: userId, summary: `更新用户资料 ${userId}`, before: beforeUser, after: afterUser, result: 'success' });
  return { data: null, message: '更新成功' };
}

async function updateSubordinate(userId, body, adminUserId, req) {
  await assertTargetIsNormalUser(userId);
  const subordinateEnabled = body.subordinateEnabled ?? body.enabled;
  const enabled = !!subordinateEnabled;
  await repo.updateSubordinateEnabled(userId, enabled);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user.subordinate_toggle',
    objectType: 'user',
    objectId: userId,
    summary: `${enabled ? '开启' : '关闭'}用户下级功能 ${userId}`,
    after: { subordinate_enabled: enabled },
    result: 'success',
  });
  return { data: { subordinate_enabled: enabled }, message: '更新成功' };
}

async function adjustUserPoints(userId, body, adminUserId, req) {
  const { points, reason } = body;
  const beforeUser = await assertTargetIsNormalUser(userId);
  const beforeBal = beforeUser.points_balance ?? 0;
  if (points === undefined) throw new BusinessError(400, '请输入积分数值');
  const delta = Number(points);
  if (!Number.isFinite(delta) || !delta) throw new BusinessError(400, '积分数值不正确');
  await requireAdjustUserPoints()(userId, delta, reason || '管理员调整', adminUserId);
  const afterBal = beforeBal + delta;
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'user.points_adjust', objectType: 'user', objectId: userId, summary: `积分调整 ${points > 0 ? '+' : ''}${points} ${reason || ''}`.trim(), before: { points_balance: beforeBal }, after: { points_balance: afterBal }, result: 'success' });
  return { data: null, message: '积分已调整' };
}

function generateTempPassword8() {
  const alphabet = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  const bytes = crypto.randomBytes(8);
  let out = '';
  for (let i = 0; i < 8; i += 1) out += alphabet[bytes[i] % alphabet.length];
  return out;
}

async function resetUserPassword(userId, adminUserId, req) {
  const user = await assertTargetIsNormalUser(userId);
  const plain = generateTempPassword8();
  const hash = await bcrypt.hash(plain, 10);
  await repo.updateUserPasswordHash(userId, hash);
  await writeAuditLog({ req, operatorId: adminUserId, actionType: 'user.reset_password', objectType: 'user', objectId: userId, summary: `重置用户密码 ${user.phone || userId}`, result: 'success' });
  return { data: { password: plain }, message: '密码已重置' };
}

async function persistUserAccountStatus(userId, accountStatus, bumpRefreshTokenVersion = false) {
  await repo.updateUserStatus(userId, accountStatus, bumpRefreshTokenVersion);
}

async function persistUserRestrictions(userId, restrictions) {
  await repo.upsertUserRestrictions(userId, restrictions);
}

async function updateUserAccountStatus(userId, body, adminUserId, req) {
  const beforeUser = await assertTargetIsNormalUser(userId);
  const nextStatus = String(body?.accountStatus || body?.account_status || '').trim();
  const reason = String(body?.reason || '').trim();
  const valid = ['normal', 'disabled', 'blacklisted'];
  if (!valid.includes(nextStatus)) throw new BusinessError(400, '账号状态不合法');
  const bump = nextStatus === 'disabled' || nextStatus === 'blacklisted';
  await persistUserAccountStatus(userId, nextStatus, bump);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user.account_status_update',
    objectType: 'user',
    objectId: userId,
    summary: `更新账户状态 ${nextStatus}`,
    before: { account_status: beforeUser.account_status || 'normal' },
    after: { account_status: nextStatus, reason, bumped_refresh_token_version: bump },
    result: 'success',
  });
  return { data: null, message: '账户状态已更新' };
}

async function updateUserRestrictions(userId, body, adminUserId, req) {
  const beforeUser = await assertTargetIsNormalUser(userId);
  const reason = String(body?.reason || '').trim();
  const before = await repo.selectUserRestrictions(userId);
  const after = {
    order_restricted: body?.orderRestricted === undefined ? before.order_restricted : (body.orderRestricted ? 1 : 0),
    coupon_restricted: body?.couponRestricted === undefined ? before.coupon_restricted : (body.couponRestricted ? 1 : 0),
    comment_restricted: body?.commentRestricted === undefined ? before.comment_restricted : (body.commentRestricted ? 1 : 0),
  };
  await persistUserRestrictions(userId, after);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user.restrictions_update',
    objectType: 'user',
    objectId: userId,
    summary: '更新能力限制',
    before: { restrictions: before },
    after: { restrictions: after, reason },
    result: 'success',
  });
  return {
    data: {
      order_restricted: !!after.order_restricted,
      coupon_restricted: !!after.coupon_restricted,
      comment_restricted: !!after.comment_restricted,
    },
    message: '能力限制已更新',
  };
}

async function getUserStatusOverview(userId) {
  const user = await assertTargetIsNormalUser(userId);
  return { data: await buildStatusOverview(userId, user) };
}

const USER_EXPORT_HEADERS = [
  'id', 'phone', 'nickname', 'member_level', 'total_spent', 'order_count', 'points_balance', 'wechat_bound', 'phone_bound', 'tags', 'account_status', 'invite_code', 'parent_invite_code', 'created_at',
];

async function exportUsersCsv(query) {
  const {
    keyword, tagId, wechatBound, phoneBound, memberLevelId, accountStatus, dateFrom, dateTo,
    totalSpentMin, totalSpentMax, orderCountMin, orderCountMax, pointsMin, pointsMax, refundRateMin, refundRateMax,
    orderRestricted, couponRestricted, commentRestricted,
  } = query;
  const { where, params } = repo.buildUserListWhere(keyword, tagId, {
    wechatBound, phoneBound, memberLevelId, accountStatus, dateFrom, dateTo,
    totalSpentMin, totalSpentMax, orderCountMin, orderCountMax, pointsMin, pointsMax, refundRateMin, refundRateMax,
    orderRestricted, couponRestricted, commentRestricted,
  });
  const rows = await repo.selectUsersForExport(where, params);
  const tagsByUserId = await repo.selectTagsForUserIds(rows.map((u) => u.id));
  const data = rows.map((u) => ({
    id: u.id,
    phone: u.phone,
    nickname: u.nickname || '',
    member_level: u.member_level_name || '',
    total_spent: Number(u.total_spent || 0).toFixed(2),
    order_count: Number(u.valid_order_count || 0),
    points_balance: u.points_balance ?? 0,
    wechat_bound: u.wechat ? 'Y' : 'N',
    phone_bound: u.phone ? 'Y' : 'N',
    tags: (tagsByUserId[u.id] || []).map((tag) => tag.name).join('|'),
    account_status: u.account_status || 'normal',
    invite_code: u.invite_code || '',
    parent_invite_code: u.parent_invite_code || '',
    created_at: u.created_at ? new Date(u.created_at).toISOString() : '',
  }));
  const csv = rowsToCsvLocalized(USER_EXPORT_HEADERS, data);
  return { csv, filename: `users_${Date.now()}.csv` };
}

module.exports = {
  listUsers,
  getUserById,
  listUserTags,
  createUserTag,
  updateUserTag,
  deleteUserTag,
  setUserTags,
  batchSetUserTag,
  getUserTagImpact,
  updateUser,
  updateSubordinate,
  adjustUserPoints,
  resetUserPassword,
  adminUnbindWechat,
  exportUsersCsv,
  updateUserAccountStatus,
  updateUserRestrictions,
  getUserStatusOverview,
  assertTargetIsNormalUser,
};






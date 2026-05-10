const { BusinessError } = require('../../errors/BusinessError');
const { rowsToCsv } = require('../../utils/csv');
const repo = require('./adminUser.repository');
const { writeAuditLog } = require('../../utils/auditLog');
const { formatUserResponse } = require('../../utils/formatUserResponse');
const userModule = require('../user');
const { normalizeIntlPhone, buildPhoneLookupCandidates } = require('../../utils/phone');
const { generateId } = require('../../utils/helpers');

const adjustUserPointsFn = /** @type {any} */ (userModule).api?.adjustUserPoints;
if (typeof adjustUserPointsFn !== 'function') {
  throw new Error('User 模块 API 未暴露 adjustUserPoints');
}

async function listUsers(query) {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const pageSize = Math.min(50, Math.max(1, parseInt(query.pageSize, 10) || 20));
  const { keyword, tagId } = query;
  const { where, params } = repo.buildUserListWhere(keyword, tagId);
  const total = await repo.countUsers(where, params);
  const offset = (page - 1) * pageSize;
  const list = await repo.selectUsersPage(where, params, pageSize, offset);
  const tagsByUserId = await repo.selectTagsForUserIds(list.map((u) => u.id));
  return {
    kind: 'paginate',
    list: list.map((u) => formatUserResponse({ ...u, tags: tagsByUserId[u.id] || [] }, 'admin')),
    total,
    page,
    pageSize,
  };
}

async function getUserById(userId) {
  const user = await repo.selectUserSummaryById(userId);
  if (!user) throw new BusinessError(404, '用户不存在');
  const orderCount = await repo.countOrdersByUserId(userId);
  const totalSpentRaw = await repo.sumUserSpentExcludingCancelled(userId);
  const tagsByUserId = await repo.selectTagsForUserIds([userId]);
  user.orderCount = orderCount;
  user.totalSpent = parseFloat(totalSpentRaw);
  user.tags = tagsByUserId[userId] || [];
  return { data: formatUserResponse(user, 'admin') };
}

function normalizeTagInput(body) {
  const name = body.name == null ? undefined : String(body.name).trim();
  const color = body.color == null || !String(body.color).trim() ? '金色' : String(body.color).trim().slice(0, 20);
  const description = body.description == null ? '' : String(body.description).trim().slice(0, 255);
  const sortOrder = Number.isFinite(Number(body.sort_order ?? body.sortOrder))
    ? Number(body.sort_order ?? body.sortOrder)
    : 0;
  return { name, color, description, sortOrder };
}

async function listUserTags() {
  const rows = await repo.selectUserTags();
  return {
    data: rows.map((row) => ({
      id: row.id,
      name: row.name,
      color: row.color || '金色',
      description: row.description || '',
      sort_order: row.sort_order ?? 0,
      count: Number(row.user_count) || 0,
    })),
  };
}

async function createUserTag(body, adminUserId, req) {
  const tag = normalizeTagInput(body || {});
  if (!tag.name) throw new BusinessError(400, '标签名称必填');
  const id = generateId();
  try {
    await repo.insertUserTag({ id, ...tag });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new BusinessError(400, '标签已存在');
    throw err;
  }
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user_tag.create',
    objectType: 'user_tag',
    objectId: id,
    summary: `创建用户标签 ${tag.name}`,
    after: tag,
    result: 'success',
  });
  return { data: { id, name: tag.name, color: tag.color, description: tag.description, sort_order: tag.sortOrder, count: 0 }, message: '创建成功' };
}

async function updateUserTag(tagId, body, adminUserId, req) {
  const fields = [];
  const values = [];
  if (body.name !== undefined) {
    const name = String(body.name).trim();
    if (!name) throw new BusinessError(400, '标签名称必填');
    fields.push('name = ?');
    values.push(name);
  }
  if (body.color !== undefined) {
    fields.push('color = ?');
    values.push(String(body.color || '金色').trim().slice(0, 20) || '金色');
  }
  if (body.description !== undefined) {
    fields.push('description = ?');
    values.push(String(body.description || '').trim().slice(0, 255));
  }
  if (body.sort_order !== undefined || body.sortOrder !== undefined) {
    const sortOrder = Number(body.sort_order ?? body.sortOrder);
    fields.push('sort_order = ?');
    values.push(Number.isFinite(sortOrder) ? sortOrder : 0);
  }
  if (fields.length === 0) throw new BusinessError(400, '没有需要更新的字段');
  try {
    await repo.updateUserTagDynamic(tagId, fields, values);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') throw new BusinessError(400, '标签已存在');
    throw err;
  }
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user_tag.update',
    objectType: 'user_tag',
    objectId: tagId,
    summary: `更新用户标签 ${tagId}`,
    after: body,
    result: 'success',
  });
  return { data: null, message: '更新成功' };
}

async function deleteUserTag(tagId, adminUserId, req) {
  await repo.deleteUserTag(tagId);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user_tag.delete',
    objectType: 'user_tag',
    objectId: tagId,
    summary: `删除用户标签 ${tagId}`,
    result: 'success',
  });
  return { data: null, message: '已删除' };
}

async function setUserTags(userId, body, adminUserId, req) {
  const user = await repo.selectUserSummaryById(userId);
  if (!user) throw new BusinessError(404, '用户不存在');
  const rawTagIds = Array.isArray(body.tagIds) ? body.tagIds : body.tag_ids;
  if (!Array.isArray(rawTagIds)) throw new BusinessError(400, '请选择标签');
  const tagIds = [...new Set(rawTagIds.map((id) => String(id).trim()).filter(Boolean))];
  const existingTagIds = await repo.selectExistingTagIds(tagIds);
  if (existingTagIds.length !== tagIds.length) throw new BusinessError(400, '存在无效标签');
  await repo.replaceUserTagAssignments(userId, tagIds);
  const tagsByUserId = await repo.selectTagsForUserIds([userId]);
  await writeAuditLog({
    req,
    operatorId: adminUserId,
    actionType: 'user.tags_update',
    objectType: 'user',
    objectId: userId,
    summary: `更新用户标签 ${userId}`,
    after: { tagIds },
    result: 'success',
  });
  return { data: tagsByUserId[userId] || [], message: '标签已更新' };
}

async function updateUser(userId, body) {
  const fields = [];
  const values = [];
  for (const f of ['nickname', 'avatar', 'wechat', 'whatsapp']) {
    if (body[f] !== undefined) {
      fields.push(`${f} = ?`);
      values.push(body[f]);
    }
  }
  if (body.phone !== undefined) {
    const normalizedPhone = normalizeIntlPhone(body.phone, body.countryCode);
    if (!normalizedPhone || !/^\+(60|86)\d+$/.test(normalizedPhone)) {
      throw new BusinessError(400, '仅支持 +60 或 +86 手机号');
    }
    const dup = await repo.findPhoneDuplicateByPhones(
      userId,
      buildPhoneLookupCandidates(body.phone, body.countryCode),
    );
    if (dup) throw new BusinessError(409, '该手机号已被其他用户使用');
    fields.push('phone = ?');
    values.push(normalizedPhone);
  }
  if (fields.length === 0) throw new BusinessError(400, '没有需要更新的字段');
  await repo.updateUserDynamic(fields, values, userId);
  return { data: null, message: '更新成功' };
}

async function updateSubordinate(userId, body) {
  const subordinateEnabled = body.subordinateEnabled ?? body.enabled;
  await repo.updateSubordinateEnabled(userId, !!subordinateEnabled);
  return { data: null, message: '更新成功' };
}

async function adjustUserPoints(userId, body, adminUserId, req) {
  const { points, reason } = body;
  const beforeUser = await repo.selectUserSummaryById(userId);
  if (!beforeUser) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'user.points_adjust',
      objectType: 'user',
      objectId: userId,
      summary: '积分调整失败',
      result: 'failure',
      errorMessage: '用户不存在',
    });
    throw new BusinessError(404, '用户不存在');
  }
  const beforeBal = beforeUser.points_balance ?? 0;

  try {
    if (points === undefined) throw new BusinessError(400, '请输入积分数值');
    const delta = Number(points);
    if (!Number.isFinite(delta) || !delta) throw new BusinessError(400, '积分数值不正确');
    await adjustUserPointsFn(userId, delta, reason || '管理员调整', adminUserId);
    const afterBal = beforeBal + delta;
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'user.points_adjust',
      objectType: 'user',
      objectId: userId,
      summary: `积分调整 ${points > 0 ? '+' : ''}${points} ${reason || ''}`.trim(),
      before: { points_balance: beforeBal },
      after: { points_balance: afterBal },
      result: 'success',
    });
    return { data: null, message: '积分已调整' };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: adminUserId,
      actionType: 'user.points_adjust',
      objectType: 'user',
      objectId: userId,
      summary: '积分调整失败',
      before: { points_balance: beforeBal },
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

const USER_EXPORT_HEADERS = [
  'id', 'phone', 'nickname', 'member_level', 'invite_code', 'parent_invite_code', 'points_balance', 'wechat', 'whatsapp', 'tags', 'created_at',
];

async function exportUsersCsv(query) {
  const { keyword, tagId } = query;
  const { where, params } = repo.buildUserListWhere(keyword, tagId);
  const rows = await repo.selectUsersForExport(where, params);
  const tagsByUserId = await repo.selectTagsForUserIds(rows.map((u) => u.id));
  const data = rows.map((u) => ({
    id: u.id,
    phone: u.phone,
    nickname: u.nickname || '',
    member_level: u.member_level_name || '',
    invite_code: u.invite_code || '',
    parent_invite_code: u.parent_invite_code || '',
    points_balance: u.points_balance ?? 0,
    wechat: u.wechat || '',
    whatsapp: u.whatsapp || '',
    tags: (tagsByUserId[u.id] || []).map((tag) => tag.name).join('|'),
    created_at: u.created_at ? new Date(u.created_at).toISOString() : '',
  }));
  const csv = rowsToCsv(USER_EXPORT_HEADERS, data);
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
  updateUser,
  updateSubordinate,
  adjustUserPoints,
  exportUsersCsv,
};

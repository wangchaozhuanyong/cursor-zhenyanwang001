const { generateId } = require('../../../utils/helpers');
const { BusinessError, NotFoundError, ValidationError } = require('../../../errors');
const { writeAuditLog } = require('../../../utils/auditLog');
const repo = require('../repository/adminMemberLevel.repository');
const adminUserService = require('./adminUser.service');
const userModule = require('../../user');

const pool = repo.getPool();
const userApi = /** @type {any} */ (userModule).api || {};

function requireUserApi(name) {
  const fn = userApi[name];
  if (typeof fn !== 'function') throw new Error(`User module api missing: ${name}`);
  return fn;
}

function toNumber(value, fieldName) {
  const n = Number(value ?? 0);
  if (!Number.isFinite(n) || n < 0) throw new ValidationError(`${fieldName} 不能为负数`);
  return n;
}

function normalizeInput(body) {
  const name = String(body?.name || '').trim();
  if (!name) throw new ValidationError('等级名称不能为空');
  const discountRate = Number(body?.discount_rate ?? body?.discountRate ?? 1);
  const pointsMultiplier = Number(body?.points_multiplier ?? body?.pointsMultiplier ?? 1);
  const sortOrderRaw = Number(body?.sort_order ?? body?.sortOrder ?? 0);
  if (!Number.isFinite(discountRate) || discountRate <= 0 || discountRate > 1) {
    throw new ValidationError('折扣率必须在 0.01 - 1 之间');
  }
  if (!Number.isFinite(pointsMultiplier) || pointsMultiplier < 0 || pointsMultiplier > 10) {
    throw new ValidationError('积分倍率必须在 0 - 10 之间');
  }
  if (!Number.isInteger(sortOrderRaw)) throw new ValidationError('排序值必须为整数');
  return {
    name,
    description: String(body?.description || '').trim(),
    minSpent: toNumber(body?.min_spent ?? body?.minSpent, '累计消费金额'),
    minOrders: Math.floor(toNumber(body?.min_orders ?? body?.minOrders, '累计订单数')),
    discountRate,
    pointsMultiplier,
    freeShippingEnabled: body?.free_shipping_enabled === true || body?.freeShippingEnabled === true || body?.free_shipping_enabled === 1,
    sortOrder: sortOrderRaw,
    enabled: body?.enabled !== false && body?.enabled !== 0,
    isDefault: body?.is_default === true || body?.isDefault === true || body?.is_default === 1 || body?.isDefault === 1,
  };
}

async function assertLevelInvariant(q, input, existingId = null) {
  if (!input.enabled && input.isDefault) {
    throw new ValidationError('默认等级必须保持启用');
  }
  if (!input.enabled) {
    const remainingEnabled = await repo.countEnabledLevels(q, existingId);
    if (remainingEnabled <= 0) throw new ValidationError('至少需要保留一个启用会员等级');
  }
  if (!input.isDefault) {
    const remainingDefault = await repo.countEnabledDefaultLevels(q, existingId);
    if (remainingDefault <= 0) throw new ValidationError('至少需要保留一个启用的默认会员等级');
  }
}

async function listLevels() {
  const rows = await repo.selectLevels(pool);
  return rows.map(requireUserApi('normalizeMemberLevel'));
}

async function createLevel(req, body) {
  const input = normalizeInput(body);
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    await assertLevelInvariant(conn, input);
    if (input.isDefault) await repo.clearDefault(conn);
    const id = generateId();
    await repo.insertLevel(conn, { id, ...input });
    await conn.commit();
    await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'member_level.create', objectType: 'member_level', objectId: id, summary: `创建会员等级 ${input.name}`, after: input, result: 'success' });
    return { data: { id }, message: '会员等级已创建' };
  } catch (e) {
    await conn.rollback();
    if (e?.code === 'ER_DUP_ENTRY') throw new BusinessError(409, '等级名称已存在');
    throw e;
  } finally { conn.release(); }
}

async function updateLevel(req, id, body) {
  const input = normalizeInput(body);
  const before = await repo.selectLevelById(pool, id);
  if (!before) throw new NotFoundError('会员等级不存在');
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    await assertLevelInvariant(conn, input, id);
    if (input.isDefault) await repo.clearDefault(conn);
    const affected = await repo.updateLevel(conn, id, input);
    if (!affected) throw new NotFoundError('会员等级不存在');
    await conn.commit();
    await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'member_level.update', objectType: 'member_level', objectId: id, summary: `更新会员等级 ${input.name}`, before, after: input, result: 'success' });
    return { data: null, message: '会员等级已保存' };
  } catch (e) {
    await conn.rollback();
    if (e?.code === 'ER_DUP_ENTRY') throw new BusinessError(409, '等级名称已存在');
    throw e;
  } finally { conn.release(); }
}

async function deleteLevel(req, id) {
  const level = await repo.selectLevelById(pool, id);
  if (!level) throw new NotFoundError('会员等级不存在');
  if (level.is_default) throw new ValidationError('默认等级不能删除');
  const fallbackLevels = await repo.selectLevels(pool);
  const fallback = fallbackLevels.find((item) => item.enabled && item.is_default && item.id !== id);
  if (!fallback) throw new ValidationError('请先设置一个默认等级');
  const conn = await repo.getConnection();
  try {
    await conn.beginTransaction();
    const userCount = await repo.countUsersByLevel(conn, id);
    if (userCount > 0) await repo.reassignUsersToLevel(conn, id, fallback.id);
    const affected = await repo.deleteLevel(conn, id);
    if (!affected) throw new NotFoundError('会员等级不存在');
    await conn.commit();
    await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'member_level.delete', objectType: 'member_level', objectId: id, summary: `删除会员等级 ${level.name}`, before: level, after: { reassigned_to: fallback.id, reassigned_users: userCount }, result: 'success' });
    return { data: null, message: '会员等级已删除' };
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally { conn.release(); }
}

async function recalcUserLevel(req, userId, options = {}) {
  await adminUserService.assertTargetIsNormalUser(userId);
  const fn = requireUserApi('refreshUserMemberLevel');
  const result = await fn(pool, userId, { force: !!options.force });
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'member_level.recalc_user', objectType: 'user', objectId: userId, summary: `重算用户会员等级 ${userId}`, after: result, result: 'success' });
  return { data: result, message: '已重算' };
}

async function recalcAllUserLevels(req, options = {}) {
  const fn = requireUserApi('refreshUserMemberLevel');
  const users = await repo.selectAllUserIds(pool);
  const force = !!options.force;
  let changed = 0;
  let skippedLocked = 0;
  for (const user of users) {
    if (user.manualLocked && !force) {
      skippedLocked += 1;
      continue;
    }
    const r = await fn(pool, user.id, { force });
    if (r?.changed) changed += 1;
    if (r?.skippedReason === 'manual_locked') skippedLocked += 1;
  }
  const payload = { total: users.length, changed, skippedLocked, force };
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'member_level.recalc_all', objectType: 'member_level', objectId: 'all', summary: '全量重算会员等级', after: payload, result: 'success' });
  return { data: payload, message: '全量重算完成' };
}

async function assignUserLevel(req, userId, levelId, reason) {
  await adminUserService.assertTargetIsNormalUser(userId);
  const level = await repo.selectLevelById(pool, levelId);
  if (!level) throw new NotFoundError('会员等级不存在');
  if (!level.enabled) throw new ValidationError('不能手动指定到已禁用的会员等级');
  const ok = await repo.updateUserLevelManual(pool, userId, levelId, reason);
  if (!ok) throw new NotFoundError('用户不存在');
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'member_level.assign_user', objectType: 'user', objectId: userId, summary: `手动指定会员等级 ${level.name}`, after: { member_level_id: levelId, member_level_manual_locked: true, reason: reason || null }, result: 'success' });
  return { data: null, message: '已指定会员等级' };
}

async function unlockUserLevel(req, userId) {
  await adminUserService.assertTargetIsNormalUser(userId);
  const before = await repo.selectUserManualLock(pool, userId);
  if (!before) throw new NotFoundError('用户不存在');
  const ok = await repo.unlockUserLevelManual(pool, userId);
  if (!ok) throw new NotFoundError('用户不存在');
  await writeAuditLog({ req, operatorId: req.user?.id, actionType: 'member_level.unlock_user', objectType: 'user', objectId: userId, summary: `解除用户会员等级手动锁定 ${userId}`, before, after: { member_level_manual_locked: false }, result: 'success' });
  return { data: null, message: '已解除手动锁定' };
}

module.exports = {
  listLevels,
  createLevel,
  updateLevel,
  deleteLevel,
  recalcUserLevel,
  recalcAllUserLevels,
  assignUserLevel,
  unlockUserLevel,
};








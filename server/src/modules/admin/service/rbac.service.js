// @ts-nocheck
const bcrypt = require('bcryptjs');
const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { ALL_ADMIN_PERMISSION_CODES } = require('../../../constants/adminPermissions');
const { passwordSchema } = require('../../auth/schemas/auth.schemas');
const repo = require('../repository/rbac.repository');

const PRIVILEGED_ROLE_CODES = new Set(['super_admin', 'admin_manager']);

/** 账号管理：创建、禁用、重置、删除后台管理员（不可删除超级管理员，不可操作自己） */
function assertCanManageAdminAccounts(actor) {
  if (!actor?.id) throw new BusinessError(401, '未登录');
  if (actor.isSuperAdmin) return;
  if (Array.isArray(actor.permissions) && actor.permissions.includes('role.manage')) return;
  throw new BusinessError(403, '需要“角色权限”(role.manage)或超级管理员身份');
}

function normalizeRoleCodes(user) {
  if (!user) return [];
  if (Array.isArray(user.roleCodes)) return user.roleCodes;
  if (Array.isArray(user.role_codes)) return user.role_codes;
  return [];
}

function hasPrivilegedRole(user) {
  if (user?.role === 'super_admin') return true;
  return normalizeRoleCodes(user).some((code) => PRIVILEGED_ROLE_CODES.has(code));
}

function isRbacAdminTarget(user) {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'super_admin') return true;
  return user.role === 'disabled' && normalizeRoleCodes(user).length > 0;
}

function assertActorCanOperateTarget(actor, target, action) {
  if (!actor?.id) throw new BusinessError(401, '未登录');
  if (actor.isSuperAdmin) return;
  if (String(target?.id || '') === String(actor.id || '')) {
    throw new BusinessError(403, '非超级管理员不能修改自己的角色或账号状态');
  }
  if (hasPrivilegedRole(target)) {
    throw new BusinessError(403, `非超级管理员不能${action} admin_manager / super_admin 账号`);
  }
}

async function assertAssignableRoles(actor, roleIds) {
  const ids = [...new Set((roleIds || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
  if (!ids.length) throw new BusinessError(400, '请选择至少一个角色');
  const roles = [];
  for (const rid of ids) {
    // eslint-disable-next-line no-await-in-loop
    const role = await repo.selectRoleById(rid);
    if (!role) throw new BusinessError(400, '无效的角色');
    if (!actor?.isSuperAdmin && PRIVILEGED_ROLE_CODES.has(role.code)) {
      throw new BusinessError(403, '仅超级管理员可分配 admin_manager / super_admin 角色');
    }
    roles.push(role);
  }
  return { ids, roles };
}

async function getAccessContext(userId, legacyRole) {
  if (legacyRole === 'super_admin') {
    return {
      isSuperAdmin: true,
      permissions: [...ALL_ADMIN_PERMISSION_CODES],
      roleCodes: ['super_admin'],
    };
  }

  const permissions = await repo.selectPermissionCodesByUserId(userId);
  const roleCodes = await repo.selectRoleCodesByUserId(userId);

  return {
    isSuperAdmin: false,
    permissions: permissions || [],
    roleCodes: roleCodes || [],
  };
}

async function listPermissions() {
  const rows = await repo.listPermissions();
  return { data: rows };
}

async function listRoles() {
  const rows = await repo.listRolesWithPermissionIds();
  return { data: rows };
}

async function listAdminUsers() {
  const rows = await repo.listAdminUsers();
  return { data: rows };
}

async function getUserRoles(userId) {
  const user = await repo.selectUserLegacyRole(userId);
  if (!user) throw new BusinessError(404, '用户不存在');
  const roles = await repo.selectRolesForUser(userId);
  user.roleCodes = roles.map((r) => r.code);
  if (!isRbacAdminTarget(user)) {
    throw new BusinessError(400, '仅可为后台管理员分配角色');
  }
  const roleIds = roles.map((r) => r.id);
  return { data: { userId, legacyRole: user.role, roles, roleIds } };
}

async function setUserRoles(actor, targetUserId, roleIds, req) {
  if (!actor?.id) throw new BusinessError(401, '未登录');
  const target = await repo.selectUserLegacyRole(targetUserId);
  if (!target) throw new BusinessError(404, '用户不存在');
  target.roleCodes = await repo.selectRoleCodesByUserId(targetUserId);
  if (!isRbacAdminTarget(target)) {
    throw new BusinessError(400, '仅可为后台管理员分配角色');
  }
  assertActorCanOperateTarget(actor, target, '修改');

  const { ids: uniqueIds, roles } = await assertAssignableRoles(actor, roleIds);

  await repo.replaceUserRoles(targetUserId, uniqueIds);

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: actor.id,
    operatorRole: actor.role,
    actionType: 'admin.rbac.set_roles',
    objectType: 'user',
    objectId: targetUserId,
    summary: `更新用户角色 roleIds=${JSON.stringify(uniqueIds)}`,
    result: 'success',
    before: { targetUserId, roleCodes: target.roleCodes },
    after: { targetUserId, roleIds: uniqueIds, roleCodes: roles.map((role) => role.code) },
  });

  return { data: { userId: targetUserId, roleIds: uniqueIds }, message: '角色已更新' };
}

async function createRole(body, actor, req) {
  if (!actor?.isSuperAdmin) throw new BusinessError(403, '仅超级管理员可创建角色');
  const { code, name, description, permissionIds } = body;
  if (!code || !name) throw new BusinessError(400, '角色编码和名称必填');

  const existing = await repo.selectRoleById(0);
  const allRoles = await repo.listRolesWithPermissionIds();
  if (allRoles.find((r) => r.code === code)) throw new BusinessError(400, '角色编码已存在');

  const roleId = await repo.insertRole(code, name, description);
  if (Array.isArray(permissionIds) && permissionIds.length) {
    const ids = [...new Set(permissionIds.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    await repo.replaceRolePermissions(roleId, ids);
  }

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: 'rbac.create_role', objectType: 'role', objectId: String(roleId), summary: `创建角色 ${name}(${code})`, after: { code, name, permissionIds }, result: 'success' });
  return { data: { id: roleId, code, name }, message: '角色已创建' };
}

async function updateRole(roleId, body, actor, req) {
  if (!actor?.isSuperAdmin) throw new BusinessError(403, '仅超级管理员可修改角色');
  const role = await repo.selectRoleById(roleId);
  if (!role) throw new BusinessError(404, '角色不存在');

  const { name, description, permissionIds } = body;
  if (name) await repo.updateRoleById(roleId, name, description);
  if (Array.isArray(permissionIds)) {
    const ids = [...new Set(permissionIds.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    await repo.replaceRolePermissions(roleId, ids);
  }

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: 'rbac.update_role', objectType: 'role', objectId: String(roleId), summary: `更新角色 ${role.code}`, after: body, result: 'success' });
  return { data: null, message: '角色已更新' };
}

async function deleteRole(roleId, actor, req) {
  if (!actor?.isSuperAdmin) throw new BusinessError(403, '仅超级管理员可删除角色');
  const role = await repo.selectRoleById(roleId);
  if (!role) throw new BusinessError(404, '角色不存在');
  if (role.code === 'super_admin' || role.code === 'admin_manager') {
    throw new BusinessError(400, '系统内置角色不可删除');
  }

  await repo.deleteRoleById(roleId);

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: 'rbac.delete_role', objectType: 'role', objectId: String(roleId), summary: `删除角色 ${role.code}`, result: 'success' });
  return { data: null, message: '角色已删除' };
}

async function createAdminUser(body, actor, req) {
  assertCanManageAdminAccounts(actor);
  const { phone, password, nickname, roleIds } = body;
  if (!phone || !password) throw new BusinessError(400, '手机号和密码必填');

  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    throw new BusinessError(400, parsedPassword.error.issues[0]?.message || '密码强度不符合要求');
  }

  let assignedRoleIds = Array.isArray(roleIds)
    ? roleIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (!assignedRoleIds.length) {
    const fallbackRole = await repo.selectRoleByCode('customer_service');
    if (!fallbackRole) throw new BusinessError(500, '缺少默认客服角色 customer_service');
    assignedRoleIds = [fallbackRole.id];
  }
  const { ids, roles } = await assertAssignableRoles(actor, assignedRoleIds);

  const id = generateId();
  const hash = await bcrypt.hash(parsedPassword.data, 10);
  await repo.createAdminUserWithRoles({
    id,
    phone,
    passwordHash: hash,
    nickname,
    legacyRole: 'admin',
    roleIds: ids,
  });

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: actor.id,
    actionType: 'admin.create_user',
    objectType: 'user',
    objectId: id,
    summary: `创建管理员 ${phone}`,
    after: { roleIds: ids, roleCodes: roles.map((role) => role.code) },
    result: 'success',
  });
  return { data: { id, phone, nickname }, message: '管理员已创建' };
}

async function toggleAdminUser(userId, enabled, actor, req) {
  assertCanManageAdminAccounts(actor);
  if (userId === actor.id) throw new BusinessError(400, '不能禁用自己');
  const target = await repo.selectAdminUserById(userId);
  if (!target) throw new BusinessError(404, '管理员不存在');
  assertActorCanOperateTarget(actor, target, enabled ? '启用' : '禁用');
  if (target.role === 'super_admin' && !enabled) throw new BusinessError(400, '不能禁用超级管理员');
  await repo.updateAdminUserEnabled(userId, enabled);

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: enabled ? 'admin.enable_user' : 'admin.disable_user', objectType: 'user', objectId: userId, summary: `${enabled ? '启用' : '禁用'}管理员 ${userId}`, result: 'success' });
  return { data: null, message: enabled ? '已启用' : '已禁用' };
}

async function resetAdminPassword(userId, body, actor, req) {
  assertCanManageAdminAccounts(actor);
  const targetPw = await repo.selectAdminUserById(userId);
  if (!targetPw) throw new BusinessError(404, '管理员不存在');
  assertActorCanOperateTarget(actor, targetPw, '重置密码');
  const { newPassword } = body;
  const parsedPassword = passwordSchema.safeParse(newPassword);
  if (!parsedPassword.success) {
    throw new BusinessError(400, parsedPassword.error.issues[0]?.message || '密码强度不符合要求');
  }
  const hash = await bcrypt.hash(parsedPassword.data, 10);
  await repo.updatePasswordHash(userId, hash);

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: 'admin.reset_password', objectType: 'user', objectId: userId, summary: `重置管理员密码 ${userId}`, result: 'success' });
  return { data: null, message: '密码已重置' };
}

async function deleteAdminUser(userId, actor, req) {
  assertCanManageAdminAccounts(actor);
  if (userId === actor.id) throw new BusinessError(400, '不能删除自己');
  const target = await repo.selectAdminUserById(userId);
  if (!target) throw new BusinessError(404, '管理员不存在');
  assertActorCanOperateTarget(actor, target, '删除');
  const legacy = String(target.role || '').trim().toLowerCase();
  if (legacy === 'super_admin') throw new BusinessError(400, '不能删除超级管理员');

  const n = await repo.softDeleteAdminUser(userId);
  if (!n) {
    throw new BusinessError(
      400,
      '当前状态不允许删除',
    );
  }

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: 'admin.delete_user', objectType: 'user', objectId: userId, summary: `删除管理员 ${target.phone}`, result: 'success' });
  return { data: null, message: '管理员已删除' };
}

module.exports = {
  getAccessContext,
  listPermissions,
  listRoles,
  listAdminUsers,
  getUserRoles,
  setUserRoles,
  createRole,
  updateRole,
  deleteRole,
  createAdminUser,
  toggleAdminUser,
  resetAdminPassword,
  deleteAdminUser,
  ALL_ADMIN_PERMISSION_CODES,
};







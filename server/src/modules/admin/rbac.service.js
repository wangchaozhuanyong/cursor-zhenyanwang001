const bcrypt = require('bcryptjs');
const { generateId } = require('../../utils/helpers');
const { BusinessError } = require('../../errors/BusinessError');
const { ALL_ADMIN_PERMISSION_CODES } = require('../../constants/adminPermissions');
const repo = require('./rbac.repository');

async function getAccessContext(userId, legacyRole) {
  if (legacyRole === 'super_admin') {
    return {
      isSuperAdmin: true,
      permissions: [...ALL_ADMIN_PERMISSION_CODES],
      roleCodes: ['super_admin'],
    };
  }

  let permissions = await repo.selectPermissionCodesByUserId(userId);
  let roleCodes = await repo.selectRoleCodesByUserId(userId);

  if ((!permissions || permissions.length === 0) && legacyRole === 'admin') {
    permissions = await repo.selectPermissionCodesByRoleCode('admin_manager');
    roleCodes = ['admin_manager'];
  }

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
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new BusinessError(400, '仅可为后台管理员分配角色');
  }
  const roles = await repo.selectRolesForUser(userId);
  const roleIds = roles.map((r) => r.id);
  return { data: { userId, legacyRole: user.role, roles, roleIds } };
}

async function setUserRoles(actor, targetUserId, roleIds, req) {
  if (!actor?.id) throw new BusinessError(401, '未登录');
  const target = await repo.selectUserLegacyRole(targetUserId);
  if (!target) throw new BusinessError(404, '用户不存在');
  if (target.role !== 'admin' && target.role !== 'super_admin') {
    throw new BusinessError(400, '仅可为后台管理员分配角色');
  }

  const uniqueIds = [...new Set((roleIds || []).map((x) => Number(x)).filter((n) => Number.isFinite(n) && n > 0))];
  for (const rid of uniqueIds) {
    const role = await repo.selectRoleById(rid);
    if (!role) throw new BusinessError(400, '无效的角色');
    if (role.code === 'super_admin' && !actor.isSuperAdmin) {
      throw new BusinessError(403, '仅超级管理员可分配超级管理员角色');
    }
  }

  await repo.replaceUserRoles(targetUserId, uniqueIds);

  const { writeAuditLog } = require('../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: actor.id,
    operatorRole: actor.role,
    actionType: 'admin.rbac.set_roles',
    objectType: 'user',
    objectId: targetUserId,
    summary: `更新用户角色 roleIds=${JSON.stringify(uniqueIds)}`,
    result: 'success',
    after: { targetUserId, roleIds: uniqueIds },
  });

  return { data: { userId: targetUserId, roleIds: uniqueIds }, message: '已更新角色' };
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

  const { writeAuditLog } = require('../../utils/auditLog');
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

  const { writeAuditLog } = require('../../utils/auditLog');
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

  const { writeAuditLog } = require('../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: 'rbac.delete_role', objectType: 'role', objectId: String(roleId), summary: `删除角色 ${role.code}`, result: 'success' });
  return { data: null, message: '角色已删除' };
}

async function createAdminUser(body, actor, req) {
  if (!actor?.isSuperAdmin) throw new BusinessError(403, '仅超级管理员可创建管理员');
  const { phone, password, nickname, roleIds } = body;
  if (!phone || !password) throw new BusinessError(400, '手机号和密码必填');

  const id = generateId();
  const hash = await bcrypt.hash(password, 10);
  await repo.insertAdminUser(id, phone, hash, nickname, 'admin');

  if (Array.isArray(roleIds) && roleIds.length) {
    const ids = [...new Set(roleIds.map(Number).filter((n) => Number.isFinite(n) && n > 0))];
    await repo.replaceUserRoles(id, ids);
  }

  const { writeAuditLog } = require('../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: 'admin.create_user', objectType: 'user', objectId: id, summary: `创建管理员 ${phone}`, result: 'success' });
  return { data: { id, phone, nickname }, message: '管理员已创建' };
}

async function toggleAdminUser(userId, enabled, actor, req) {
  if (!actor?.isSuperAdmin) throw new BusinessError(403, '仅超级管理员可禁用/启用管理员');
  if (userId === actor.id) throw new BusinessError(400, '不能禁用自己');
  await repo.updateAdminUserEnabled(userId, enabled);

  const { writeAuditLog } = require('../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: enabled ? 'admin.enable_user' : 'admin.disable_user', objectType: 'user', objectId: userId, summary: `${enabled ? '启用' : '禁用'}管理员 ${userId}`, result: 'success' });
  return { data: null, message: enabled ? '已启用' : '已禁用' };
}

async function resetAdminPassword(userId, body, actor, req) {
  if (!actor?.isSuperAdmin) throw new BusinessError(403, '仅超级管理员可重置密码');
  const { newPassword } = body;
  if (!newPassword || newPassword.length < 6) throw new BusinessError(400, '新密码至少6位');
  const hash = await bcrypt.hash(newPassword, 10);
  await repo.updatePasswordHash(userId, hash);

  const { writeAuditLog } = require('../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: 'admin.reset_password', objectType: 'user', objectId: userId, summary: `重置管理员密码 ${userId}`, result: 'success' });
  return { data: null, message: '密码已重置' };
}

async function deleteAdminUser(userId, actor, req) {
  if (!actor?.isSuperAdmin) throw new BusinessError(403, '仅超级管理员可删除管理员');
  if (userId === actor.id) throw new BusinessError(400, '不能删除自己');
  const target = await repo.selectAdminUserById(userId);
  if (!target) throw new BusinessError(404, '管理员不存在');
  if (target.role === 'super_admin') throw new BusinessError(400, '不能删除超级管理员');

  await repo.softDeleteAdminUser(userId);

  const { writeAuditLog } = require('../../utils/auditLog');
  await writeAuditLog({ req, operatorId: actor.id, actionType: 'admin.delete_user', objectType: 'user', objectId: userId, summary: `软删除管理员 ${target.phone}`, result: 'success' });
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

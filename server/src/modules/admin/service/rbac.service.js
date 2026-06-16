// @ts-nocheck
const bcrypt = require('bcryptjs');
const { generateId } = require('../../../utils/helpers');
const { BusinessError } = require('../../../errors/BusinessError');
const { ALL_ADMIN_PERMISSION_CODES } = require('../../../constants/adminPermissions');
const { passwordSchema } = require('../../auth/schemas/auth.schemas');
const repo = require('../repository/rbac.repository');
const mfaRepo = require('../repository/adminMfa.repository');
const {
  buildPhoneLookupCandidates,
  inferCountryCodeForPhone,
  normalizeIntlPhone,
  validatePhoneForCountry,
} = require('../../../utils/phone');

function getAuthApi() {
  return /** @type {any} */ (require('../../auth/publicApi')) || {};
}

function requireAuthApi(name) {
  const fn = getAuthApi()[name];
  if (typeof fn !== 'function') {
    throw new Error(`Auth module API is missing method: ${name}`);
  }
  return fn;
}

function sortUsersForAdminLogin(users) {
  const rank = (user) => {
    if (user?.role === 'super_admin') return 0;
    if (user?.role === 'admin') return 1;
    if (user?.role === 'disabled') return 2;
    return 3;
  };
  return [...users].sort((a, b) => {
    const byRole = rank(a) - rank(b);
    if (byRole !== 0) return byRole;
    const at = new Date(a.created_at || 0).getTime();
    const bt = new Date(b.created_at || 0).getTime();
    return bt - at;
  });
}

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

function assertSuperAdmin(actor) {
  if (actor?.isSuperAdmin || actor?.role === 'super_admin') return;
  throw new BusinessError(403, 'Only super admin can change MFA policy');
}

function isPolicyForcedAdmin(user, policy) {
  if (!policy?.enabled) return false;
  return user?.role === 'admin' || user?.role === 'super_admin';
}

function applyMfaPolicyToAdminUser(user, policy) {
  if (!user) return user;
  const mfa = user.mfa || {};
  const policyForced = isPolicyForcedAdmin(user, policy);
  return {
    ...user,
    mfa: {
      ...mfa,
      accountRequired: Boolean(mfa.required),
      policyEnabled: policy?.enabled !== false,
      policyRequired: policyForced,
      required: Boolean(policy?.enabled !== false && (policyForced || mfa.required || mfa.enabled)),
    },
  };
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
  const isSuperAdmin = (roleCodes || []).includes('super_admin');

  return {
    isSuperAdmin,
    permissions: isSuperAdmin ? [...ALL_ADMIN_PERMISSION_CODES] : (permissions || []),
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
  const policy = await mfaRepo.selectMfaPolicy();
  return { data: rows.map((row) => applyMfaPolicyToAdminUser(row, policy)) };
}

async function getAdminMfaPolicy() {
  const policy = await mfaRepo.selectMfaPolicy();
  return { data: policy };
}

async function updateAdminMfaPolicy(body, actor, req) {
  assertSuperAdmin(actor);
  const before = await mfaRepo.selectMfaPolicy();
  const after = await mfaRepo.upsertMfaPolicy({ enabled: body?.enabled !== false });

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: actor.id,
    operatorRole: actor.role,
    actionType: after.enabled ? 'admin.security.enable_mfa_policy' : 'admin.security.disable_mfa_policy',
    objectType: 'site_settings',
    objectId: 'admin_mfa_policy',
    summary: after.enabled ? 'enable admin MFA policy' : 'disable admin MFA policy',
    result: 'success',
    before,
    after,
  });

  return { data: after, message: after.enabled ? 'Admin MFA policy enabled' : 'Admin MFA policy disabled' };
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
  const { phone, password, nickname, roleIds, countryCode } = body;
  if (!phone || !password) throw new BusinessError(400, '手机号和密码必填');

  const parsedPassword = passwordSchema.safeParse(password);
  if (!parsedPassword.success) {
    throw new BusinessError(400, parsedPassword.error.issues[0]?.message || '密码强度不符合要求');
  }

  const cc = countryCode || inferCountryCodeForPhone(phone) || '86';
  const phoneError = validatePhoneForCountry(phone, cc);
  if (phoneError) throw new BusinessError(400, phoneError);
  const normalizedPhone = normalizeIntlPhone(phone, cc);
  if (!normalizedPhone) throw new BusinessError(400, '手机号格式不正确');

  let assignedRoleIds = Array.isArray(roleIds)
    ? roleIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
    : [];
  if (!assignedRoleIds.length) {
    const fallbackRole = await repo.selectRoleByCode('customer_service');
    if (!fallbackRole) throw new BusinessError(500, '缺少默认客服角色 customer_service');
    assignedRoleIds = [fallbackRole.id];
  }
  const { ids, roles } = await assertAssignableRoles(actor, assignedRoleIds);

  const hash = await bcrypt.hash(parsedPassword.data, 10);
  const lookupPhones = buildPhoneLookupCandidates(normalizedPhone, cc);
  const existingUsers = sortUsersForAdminLogin(
    await requireAuthApi('findUsersByPhones')(lookupPhones),
  );
  const existingAdmin = existingUsers.find((user) => isRbacAdminTarget(user));

  let id;
  let message = '管理员已创建';
  if (existingAdmin) {
    throw new BusinessError(409, '该手机号已是管理员，请使用「重置密码」更新登录密码');
  }
  if (existingUsers.length) {
    const storefrontUser = existingUsers[0];
    id = storefrontUser.id;
    await repo.promoteUserToAdminWithRoles({
      userId: id,
      phone: normalizedPhone,
      passwordHash: hash,
      nickname,
      legacyRole: 'admin',
      roleIds: ids,
    });
    message = '已将该手机号商城账号升级为管理员，请使用新密码登录';
  } else {
    id = generateId();
    try {
      await repo.createAdminUserWithRoles({
        id,
        phone: normalizedPhone,
        passwordHash: hash,
        nickname,
        legacyRole: 'admin',
        roleIds: ids,
      });
    } catch (err) {
      if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
        throw new BusinessError(409, '该手机号已存在，请检查是否已有商城账号或管理员账号');
      }
      throw err;
    }
  }

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: actor.id,
    actionType: 'admin.create_user',
    objectType: 'user',
    objectId: id,
    summary: `创建管理员 ${normalizedPhone}`,
    after: { roleIds: ids, roleCodes: roles.map((role) => role.code) },
    result: 'success',
  });
  return { data: { id, phone: normalizedPhone, nickname }, message };
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

async function getAdminUserSecurity(userId, actor) {
  assertCanManageAdminAccounts(actor);
  const target = await repo.selectAdminUserById(userId);
  if (!target) throw new BusinessError(404, '管理员不存在');
  assertActorCanOperateTarget(actor, target, '查看安全设置');

  const settings = await mfaRepo.selectMfaSettings(userId);
  const policy = await mfaRepo.selectMfaPolicy();
  const devices = await mfaRepo.listTrustedDevices(userId);
  const policyRequired = isPolicyForcedAdmin(target, policy);
  return {
    data: {
      user: applyMfaPolicyToAdminUser(target, policy),
      policy,
      mfa: {
        enabled: Boolean(settings?.enabled),
        required: Boolean(policy.enabled && (policyRequired || settings?.required || settings?.enabled)),
        lockedRequired: Boolean(policyRequired),
        accountRequired: Boolean(settings?.required),
        policyRequired,
        enabledAt: settings?.enabled_at || null,
        lastVerifiedAt: settings?.last_verified_at || null,
      },
      trustedDevices: devices.map((device) => ({
        id: device.id,
        label: device.device_label || '',
        firstSeenAt: device.first_seen_at,
        lastSeenAt: device.last_seen_at,
        expiresAt: device.expires_at,
        revokedAt: device.revoked_at,
        active: Boolean(device.active),
      })),
    },
  };
}

async function setAdminUserMfaRequired(userId, required, actor, req) {
  assertCanManageAdminAccounts(actor);
  if (String(userId) === String(actor.id)) throw new BusinessError(400, '不能修改自己的 MFA 要求');
  const target = await repo.selectAdminUserById(userId);
  if (!target) throw new BusinessError(404, '管理员不存在');
  assertActorCanOperateTarget(actor, target, required ? '要求 MFA' : '关闭 MFA 要求');
  if (target.role === 'super_admin' && !required) throw new BusinessError(400, '超级管理员必须启用 MFA');

  if (required) {
    await mfaRepo.setMfaRequired(userId, true);
  } else {
    await mfaRepo.resetMfaSettings(userId, false);
    await mfaRepo.revokeTrustedDevices(userId);
    await repo.bumpRefreshTokenVersion(userId);
  }

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: actor.id,
    operatorRole: actor.role,
    actionType: required ? 'admin.security.require_mfa' : 'admin.security.disable_mfa_requirement',
    objectType: 'user',
    objectId: userId,
    summary: `${required ? '要求' : '关闭'}管理员 MFA userId=${userId}`,
    result: 'success',
    before: { userId, mfa: target.mfa },
    after: { userId, required: Boolean(required) },
  });

  return { data: null, message: required ? '已要求该管理员绑定 MFA' : '已关闭该管理员 MFA 要求' };
}

async function resetAdminUserMfa(userId, actor, req) {
  assertCanManageAdminAccounts(actor);
  if (String(userId) === String(actor.id)) throw new BusinessError(400, '不能重置自己的 MFA');
  const target = await repo.selectAdminUserById(userId);
  if (!target) throw new BusinessError(404, '管理员不存在');
  assertActorCanOperateTarget(actor, target, '重置 MFA');

  await mfaRepo.resetMfaSettings(userId, true);
  const revoked = await mfaRepo.revokeTrustedDevices(userId);
  await repo.bumpRefreshTokenVersion(userId);

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: actor.id,
    operatorRole: actor.role,
    actionType: 'admin.security.reset_mfa',
    objectType: 'user',
    objectId: userId,
    summary: `重置管理员 MFA userId=${userId}`,
    result: 'success',
    before: { userId, mfa: target.mfa },
    after: { userId, required: true, enabled: false, trustedDevicesRevoked: true, revokedTrustedDeviceCount: revoked },
  });

  return { data: { revokedTrustedDeviceCount: revoked }, message: '已重置 MFA，下次登录需要重新绑定' };
}

async function revokeAdminTrustedDevices(userId, actor, req) {
  assertCanManageAdminAccounts(actor);
  if (String(userId) === String(actor.id)) throw new BusinessError(400, '不能在员工管理中撤销自己的可信设备');
  const target = await repo.selectAdminUserById(userId);
  if (!target) throw new BusinessError(404, '管理员不存在');
  assertActorCanOperateTarget(actor, target, '撤销可信设备');

  const revoked = await mfaRepo.revokeTrustedDevices(userId);
  await repo.bumpRefreshTokenVersion(userId);

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: actor.id,
    operatorRole: actor.role,
    actionType: 'admin.security.revoke_trusted_devices',
    objectType: 'user',
    objectId: userId,
    summary: `撤销管理员可信设备 userId=${userId}`,
    result: 'success',
    after: { userId, revoked },
  });

  return { data: { revoked }, message: '已撤销可信设备' };
}

async function revokeAdminTrustedDevice(userId, deviceId, actor, req) {
  assertCanManageAdminAccounts(actor);
  if (String(userId) === String(actor.id)) throw new BusinessError(400, '不能在员工管理中撤销自己的可信设备');
  const target = await repo.selectAdminUserById(userId);
  if (!target) throw new BusinessError(404, '管理员不存在');
  assertActorCanOperateTarget(actor, target, '撤销可信设备');

  const affected = await mfaRepo.revokeTrustedDevice(userId, deviceId);
  if (!affected) throw new BusinessError(404, '可信设备不存在');
  await repo.bumpRefreshTokenVersion(userId);

  const { writeAuditLog } = require('../../../utils/auditLog');
  await writeAuditLog({
    req,
    operatorId: actor.id,
    operatorRole: actor.role,
    actionType: 'admin.security.revoke_trusted_device',
    objectType: 'admin_trusted_device',
    objectId: deviceId,
    summary: `撤销管理员可信设备 userId=${userId} deviceId=${deviceId}`,
    result: 'success',
    after: { userId, deviceId },
  });

  return { data: { revoked: 1 }, message: '已撤销可信设备' };
}

module.exports = {
  sortUsersForAdminLogin,
  getAccessContext,
  listPermissions,
  listRoles,
  listAdminUsers,
  getAdminMfaPolicy,
  updateAdminMfaPolicy,
  getUserRoles,
  setUserRoles,
  createRole,
  updateRole,
  deleteRole,
  createAdminUser,
  toggleAdminUser,
  resetAdminPassword,
  deleteAdminUser,
  getAdminUserSecurity,
  setAdminUserMfaRequired,
  resetAdminUserMfa,
  revokeAdminTrustedDevices,
  revokeAdminTrustedDevice,
  ALL_ADMIN_PERMISSION_CODES,
};

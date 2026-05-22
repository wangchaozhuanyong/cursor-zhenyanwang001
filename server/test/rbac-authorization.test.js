/**
 * RBAC 授权边界：特权角色分配、特权账号操作、空角色校验。
 */
require('./setupTestEnv').requireTestDatabase();
require('./_dbCleanup.test');
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const db = require('../src/config/db');
const rbac = require('../src/modules/admin/service/rbac.service');
const repo = require('../src/modules/admin/repository/rbac.repository');
const { BusinessError } = require('../src/errors');
const { generateId } = require('../src/utils/helpers');

const mockReq = { headers: {}, ip: '127.0.0.1' };

async function expectBusinessError(promise, statusCode, messagePattern) {
  await assert.rejects(promise, (err) => {
    assert.ok(err instanceof BusinessError, `expected BusinessError, got ${err?.constructor?.name}`);
    assert.equal(err.statusCode, statusCode);
    if (messagePattern) assert.match(err.message, messagePattern);
    return true;
  });
}

function actorFromUser(row, permissions = ['role.manage']) {
  const isSuperAdmin = row.role === 'super_admin';
  return {
    id: row.id,
    role: row.role,
    isSuperAdmin,
    permissions: isSuperAdmin ? rbac.ALL_ADMIN_PERMISSION_CODES : permissions,
  };
}

describe('rbac authorization boundaries', () => {
  let superActor;
  let regularActor;
  let targetUserId;
  let roleByCode;

  before(async () => {
    const rolesRes = await rbac.listRoles();
    roleByCode = Object.fromEntries(rolesRes.data.map((r) => [r.code, r]));

    assert.ok(roleByCode.customer_service, 'customer_service role required');
    assert.ok(roleByCode.super_admin, 'super_admin role required');

    const [[existingSuper]] = await db.query(
      "SELECT id, role FROM users WHERE role = 'super_admin' AND deleted_at IS NULL LIMIT 1",
    );

    const regularId = generateId();
    const regularPhone = `rbac-regular-${Date.now()}`;
    const hash = await bcrypt.hash('RbacTest12', 4);
    await repo.createAdminUserWithRoles({
      id: regularId,
      phone: regularPhone,
      passwordHash: hash,
      nickname: 'rbac-regular',
      legacyRole: 'admin',
      roleIds: [roleByCode.customer_service.id],
    });
    regularActor = {
      id: regularId,
      role: 'admin',
      isSuperAdmin: false,
      permissions: ['role.manage'],
    };

    if (existingSuper?.id) {
      superActor = actorFromUser(existingSuper);
    } else {
      const superId = generateId();
      const superPhone = `rbac-super-${Date.now()}`;
      await repo.createAdminUserWithRoles({
        id: superId,
        phone: superPhone,
        passwordHash: hash,
        nickname: 'rbac-super',
        legacyRole: 'super_admin',
        roleIds: [roleByCode.super_admin.id],
      });
      superActor = actorFromUser({ id: superId, role: 'super_admin' });
    }

    targetUserId = generateId();
    const targetPhone = `rbac-target-${Date.now()}`;
    await repo.createAdminUserWithRoles({
      id: targetUserId,
      phone: targetPhone,
      passwordHash: hash,
      nickname: 'rbac-target',
      legacyRole: 'admin',
      roleIds: [roleByCode.customer_service.id],
    });
  });

  after(async () => {
    const ids = [regularActor?.id, targetUserId, superActor?.id].filter(Boolean);
    for (const id of ids) {
      await db.query('DELETE FROM user_roles WHERE user_id = ?', [id]).catch(() => {});
      await db.query('DELETE FROM admin_mfa_settings WHERE user_id = ?', [id]).catch(() => {});
      await db.query('DELETE FROM admin_trusted_devices WHERE user_id = ?', [id]).catch(() => {});
      await db.query('DELETE FROM users WHERE id = ?', [id]).catch(() => {});
    }
  });

  test('non-super admin cannot assign super_admin role', async () => {
    await expectBusinessError(
      rbac.setUserRoles(regularActor, targetUserId, [roleByCode.super_admin.id], mockReq),
      403,
      /超级管理员/,
    );
  });

  test('non-super admin cannot assign admin_manager role when role exists', async () => {
    if (!roleByCode.admin_manager) return;
    await expectBusinessError(
      rbac.setUserRoles(regularActor, targetUserId, [roleByCode.admin_manager.id], mockReq),
      403,
      /超级管理员/,
    );
  });

  test('setUserRoles rejects empty role list', async () => {
    await expectBusinessError(
      rbac.setUserRoles(superActor, targetUserId, [], mockReq),
      400,
      /至少一个角色/,
    );
  });

  test('non-super admin cannot modify privileged target account roles', async () => {
    if (!roleByCode.admin_manager) return;
    await repo.replaceUserRoles(targetUserId, [roleByCode.admin_manager.id]);
    await expectBusinessError(
      rbac.setUserRoles(regularActor, targetUserId, [roleByCode.customer_service.id], mockReq),
      403,
      /admin_manager/,
    );
  });

  test('createAdminUser rejects privileged roleIds for non-super actor', async () => {
    const phone = `rbac-create-${Date.now()}`;
    await expectBusinessError(
      rbac.createAdminUser(
        {
          phone,
          password: 'RbacTest12',
          nickname: 'x',
          roleIds: [roleByCode.super_admin.id],
        },
        regularActor,
        mockReq,
      ),
      403,
      /超级管理员/,
    );
  });

  test('createAdminUser without roleIds falls back to customer_service', async () => {
    const phone = `rbac-fallback-${Date.now()}`;
    const created = await rbac.createAdminUser(
      {
        phone,
        password: 'RbacTest12',
        nickname: 'rbac-fallback',
      },
      regularActor,
      mockReq,
    );
    assert.ok(created.data?.id);
    const codes = await repo.selectRoleCodesByUserId(created.data.id);
    assert.ok(codes.includes('customer_service'));
    await db.query('DELETE FROM user_roles WHERE user_id = ?', [created.data.id]);
    await db.query('DELETE FROM users WHERE id = ?', [created.data.id]);
  });

  test('createAdminUser rejects invalid role id', async () => {
    const phone = `rbac-bad-role-${Date.now()}`;
    await expectBusinessError(
      rbac.createAdminUser(
        {
          phone,
          password: 'RbacTest12',
          nickname: 'x',
          roleIds: [999999999],
        },
        regularActor,
        mockReq,
      ),
      400,
      /无效的角色/,
    );
  });

  test('regular admin can create user with customer_service role', async () => {
    const phone = `rbac-ok-${Date.now()}`;
    const created = await rbac.createAdminUser(
      {
        phone,
        password: 'RbacTest12',
        nickname: 'rbac-ok',
        roleIds: [roleByCode.customer_service.id],
      },
      regularActor,
      mockReq,
    );
    assert.ok(created.data?.id);
    await db.query('DELETE FROM user_roles WHERE user_id = ?', [created.data.id]);
    await db.query('DELETE FROM users WHERE id = ?', [created.data.id]);
  });

  test('super admin can assign customer_service role', async () => {
    const result = await rbac.setUserRoles(
      superActor,
      targetUserId,
      [roleByCode.customer_service.id],
      mockReq,
    );
    assert.deepEqual(result.data.roleIds, [roleByCode.customer_service.id]);
  });
});

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
let phoneSeq = 0;

function uniqueMalaysiaPhone() {
  phoneSeq += 1;
  const seed = String(Date.now() + phoneSeq).slice(-8).padStart(8, '0');
  return `01${seed}`;
}

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
      await db.query('DELETE FROM audit_logs WHERE operator_id = ? OR object_id = ?', [id, id]).catch(() => {});
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
    const phone = uniqueMalaysiaPhone();
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
    const phone = uniqueMalaysiaPhone();
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
    const phone = uniqueMalaysiaPhone();
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
    const phone = uniqueMalaysiaPhone();
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

  test('super admin can reset another admin MFA and revoke trusted devices', async () => {
    await db.query(
      `INSERT INTO admin_mfa_settings (user_id, totp_secret_enc, enabled, required, enabled_at, last_verified_at)
       VALUES (?, 'encrypted-secret', 1, 1, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
         totp_secret_enc = VALUES(totp_secret_enc),
         enabled = VALUES(enabled),
         required = VALUES(required),
         enabled_at = VALUES(enabled_at),
         last_verified_at = VALUES(last_verified_at)`,
      [targetUserId],
    );
    await db.query(
      `INSERT INTO admin_trusted_devices (id, user_id, device_hash, user_agent_hash, expires_at)
       VALUES (?, ?, ?, 'ua-hash', DATE_ADD(NOW(), INTERVAL 7 DAY))
       ON DUPLICATE KEY UPDATE revoked_at = NULL, expires_at = VALUES(expires_at)`,
      [generateId(), targetUserId, `device-${Date.now()}`],
    );
    const [[beforeUser]] = await db.query('SELECT refresh_token_version FROM users WHERE id = ?', [targetUserId]);

    const result = await rbac.resetAdminUserMfa(targetUserId, superActor, mockReq);

    assert.equal(result.data.revokedTrustedDeviceCount, 1);
    const [[mfa]] = await db.query(
      'SELECT totp_secret_enc, enabled, required, enabled_at, last_verified_at FROM admin_mfa_settings WHERE user_id = ?',
      [targetUserId],
    );
    assert.equal(mfa.totp_secret_enc, null);
    assert.equal(Number(mfa.enabled), 0);
    assert.equal(Number(mfa.required), 1);
    assert.equal(mfa.enabled_at, null);
    assert.equal(mfa.last_verified_at, null);

    const [[devices]] = await db.query(
      'SELECT COUNT(*) AS active_count FROM admin_trusted_devices WHERE user_id = ? AND revoked_at IS NULL',
      [targetUserId],
    );
    assert.equal(Number(devices.active_count), 0);

    const [[afterUser]] = await db.query('SELECT refresh_token_version FROM users WHERE id = ?', [targetUserId]);
    assert.equal(Number(afterUser.refresh_token_version), Number(beforeUser.refresh_token_version) + 1);
  });

  test('resetAdminUserMfa requires role.manage permission', async () => {
    await expectBusinessError(
      rbac.resetAdminUserMfa(targetUserId, { ...regularActor, permissions: [] }, mockReq),
      403,
      /role.manage/,
    );
  });

  test('resetAdminUserMfa rejects resetting own MFA', async () => {
    await expectBusinessError(
      rbac.resetAdminUserMfa(superActor.id, superActor, mockReq),
      400,
      /自己的 MFA/,
    );
  });

  test('regular admin cannot reset privileged admin MFA', async () => {
    if (!roleByCode.admin_manager) return;
    const privilegedId = generateId();
    await repo.createAdminUserWithRoles({
      id: privilegedId,
      phone: `rbac-privileged-${Date.now()}`,
      passwordHash: await bcrypt.hash('RbacTest12', 4),
      nickname: 'rbac-privileged',
      legacyRole: 'admin',
      roleIds: [roleByCode.admin_manager.id],
    });
    try {
      await expectBusinessError(
        rbac.resetAdminUserMfa(privilegedId, regularActor, mockReq),
        403,
        /admin_manager/,
      );
    } finally {
      await db.query('DELETE FROM audit_logs WHERE operator_id = ? OR object_id = ?', [privilegedId, privilegedId]).catch(() => {});
      await db.query('DELETE FROM user_roles WHERE user_id = ?', [privilegedId]).catch(() => {});
      await db.query('DELETE FROM admin_mfa_settings WHERE user_id = ?', [privilegedId]).catch(() => {});
      await db.query('DELETE FROM admin_trusted_devices WHERE user_id = ?', [privilegedId]).catch(() => {});
      await db.query('DELETE FROM users WHERE id = ?', [privilegedId]).catch(() => {});
    }
  });
});

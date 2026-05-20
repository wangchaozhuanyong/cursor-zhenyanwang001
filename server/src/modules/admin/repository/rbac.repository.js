// @ts-nocheck
const db = require('../../../config/db');

async function selectPermissionCodesByUserId(userId) {
  const [rows] = await db.query(
    `SELECT DISTINCT p.code AS code
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     JOIN role_permissions rp ON rp.role_id = r.id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE ur.user_id = ?
     ORDER BY p.code`,
    [userId],
  );
  return rows.map((x) => x.code);
}

async function selectRoleCodesByUserId(userId) {
  const [rows] = await db.query(
    `SELECT r.code AS code
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?
     ORDER BY r.code`,
    [userId],
  );
  return rows.map((x) => x.code);
}

async function selectPermissionCodesByRoleCode(roleCode) {
  const [rows] = await db.query(
    `SELECT DISTINCT p.code AS code
     FROM roles r
     JOIN role_permissions rp ON rp.role_id = r.id
     JOIN permissions p ON p.id = rp.permission_id
     WHERE r.code = ?
     ORDER BY p.code`,
    [roleCode],
  );
  return rows.map((x) => x.code);
}

async function listPermissions() {
  const [rows] = await db.query(
    `SELECT id, code, name, sort_order FROM permissions ORDER BY sort_order, id`,
  );
  return rows;
}

async function listRolesWithPermissionIds() {
  const [rows] = await db.query(
    `SELECT r.id, r.code, r.name, r.description, r.is_system,
            GROUP_CONCAT(rp.permission_id ORDER BY rp.permission_id) AS permission_ids
     FROM roles r
     LEFT JOIN role_permissions rp ON rp.role_id = r.id
     GROUP BY r.id, r.code, r.name, r.description, r.is_system
     ORDER BY r.id`,
  );
  return rows.map((row) => ({
    ...row,
    permissionIds: row.permission_ids
      ? row.permission_ids.split(',').map((x) => Number(x))
      : [],
  }));
}

async function selectUserLegacyRole(userId) {
  const [[row]] = await db.query(`SELECT id, role, account_status FROM users WHERE id = ? AND deleted_at IS NULL`, [userId]);
  return row || null;
}

async function replaceUserRoles(userId, roleIds) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM user_roles WHERE user_id = ?`, [userId]);
    for (const rid of roleIds) {
      await conn.query(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [userId, rid]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function selectRoleById(roleId) {
  const [[row]] = await db.query(`SELECT id, code, name FROM roles WHERE id = ?`, [roleId]);
  return row || null;
}

async function selectRoleByCode(code) {
  const [[row]] = await db.query(`SELECT id, code, name FROM roles WHERE code = ?`, [code]);
  return row || null;
}

async function selectRolesForUser(userId) {
  const [rows] = await db.query(
    `SELECT r.id, r.code, r.name
     FROM user_roles ur
     JOIN roles r ON r.id = ur.role_id
     WHERE ur.user_id = ?
     ORDER BY r.id`,
    [userId],
  );
  return rows;
}

async function listAdminUsers() {
  const [rows] = await db.query(
    `SELECT u.id, u.phone, u.nickname, u.email, u.role, u.account_status, u.created_at, u.last_login_at,
            GROUP_CONCAT(r.code ORDER BY r.code) AS role_codes
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.deleted_at IS NULL
       AND (
        u.role IN ('admin', 'super_admin')
        OR (
          u.role = 'disabled'
          AND EXISTS (SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = u.id)
        )
       )
     GROUP BY u.id, u.phone, u.nickname, u.email, u.role, u.account_status, u.created_at, u.last_login_at
     ORDER BY u.created_at DESC`,
  );
  return rows.map((row) => ({
    ...row,
    roleCodes: row.role_codes ? String(row.role_codes).split(',').filter(Boolean) : [],
  }));
}

async function selectAdminUserById(userId) {
  const [[row]] = await db.query(
    `SELECT u.id, u.phone, u.nickname, u.email, u.role, u.account_status, u.created_at, u.last_login_at,
            GROUP_CONCAT(r.code ORDER BY r.code) AS role_codes
     FROM users u
     LEFT JOIN user_roles ur ON ur.user_id = u.id
     LEFT JOIN roles r ON r.id = ur.role_id
     WHERE u.id = ?
       AND u.deleted_at IS NULL
       AND (
         u.role IN ('admin','super_admin')
         OR (
           u.role = 'disabled'
           AND EXISTS (SELECT 1 FROM user_roles ur2 WHERE ur2.user_id = u.id)
         )
       )
     GROUP BY u.id, u.phone, u.nickname, u.email, u.role, u.account_status, u.created_at, u.last_login_at`,
    [userId],
  );
  if (!row) return null;
  return {
    ...row,
    roleCodes: row.role_codes ? String(row.role_codes).split(',').filter(Boolean) : [],
  };
}

async function insertAdminUser(id, phone, passwordHash, nickname, role) {
  const inviteCode = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  await db.query(
    `INSERT INTO users (id, phone, password_hash, nickname, role, invite_code) VALUES (?,?,?,?,?,?)`,
    [id, phone, passwordHash, nickname || 'Admin', role || 'admin', inviteCode],
  );
}

async function updateAdminUserEnabled(userId, enabled) {
  const role = enabled ? 'admin' : 'disabled';
  const accountStatus = enabled ? 'normal' : 'disabled';
  await db.query(
    `UPDATE users
     SET role = ?, account_status = ?, refresh_token_version = refresh_token_version + 1
     WHERE id = ? AND role IN ('admin','disabled') AND deleted_at IS NULL`,
    [role, accountStatus, userId],
  );
}

async function softDeleteAdminUser(userId) {
  const [res] = await db.query(
    `UPDATE users
     SET role = 'disabled',
         account_status = 'disabled',
         refresh_token_version = refresh_token_version + 1,
         deleted_at = NOW()
     WHERE id = ? AND role IN ('admin','disabled') AND deleted_at IS NULL`,
    [userId],
  );
  return res.affectedRows ?? 0;
}

async function updatePasswordHash(userId, hash) {
  await db.query(
    `UPDATE users SET password_hash = ?, refresh_token_version = refresh_token_version + 1 WHERE id = ?`,
    [hash, userId],
  );
}

async function createAdminUserWithRoles({ id, phone, passwordHash, nickname, legacyRole, roleIds }) {
  const inviteCode = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(
      `INSERT INTO users (id, phone, password_hash, nickname, role, invite_code, account_status)
       VALUES (?, ?, ?, ?, ?, ?, 'normal')`,
      [id, phone, passwordHash, nickname || 'Admin', legacyRole || 'admin', inviteCode],
    );
    for (const roleId of roleIds) {
      await conn.query(`INSERT INTO user_roles (user_id, role_id) VALUES (?, ?)`, [id, roleId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function insertRole(code, name, description) {
  const [result] = await db.query(
    `INSERT INTO roles (code, name, description, is_system) VALUES (?, ?, ?, 0)`,
    [code, name, description || ''],
  );
  return result.insertId;
}

async function updateRoleById(id, name, description) {
  await db.query(`UPDATE roles SET name = ?, description = ? WHERE id = ?`, [name, description || '', id]);
}

async function deleteRoleById(id) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM role_permissions WHERE role_id = ?`, [id]);
    await conn.query(`DELETE FROM user_roles WHERE role_id = ?`, [id]);
    await conn.query(`DELETE FROM roles WHERE id = ? AND is_system = 0`, [id]);
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

async function replaceRolePermissions(roleId, permissionIds) {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query(`DELETE FROM role_permissions WHERE role_id = ?`, [roleId]);
    for (const pid of permissionIds) {
      await conn.query(`INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)`, [roleId, pid]);
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}

module.exports = {
  selectPermissionCodesByUserId,
  selectRoleCodesByUserId,
  selectPermissionCodesByRoleCode,
  listPermissions,
  listRolesWithPermissionIds,
  selectUserLegacyRole,
  replaceUserRoles,
  selectRoleById,
  selectRoleByCode,
  selectRolesForUser,
  listAdminUsers,
  selectAdminUserById,
  insertAdminUser,
  updateAdminUserEnabled,
  softDeleteAdminUser,
  updatePasswordHash,
  createAdminUserWithRoles,
  insertRole,
  updateRoleById,
  deleteRoleById,
  replaceRolePermissions,
};





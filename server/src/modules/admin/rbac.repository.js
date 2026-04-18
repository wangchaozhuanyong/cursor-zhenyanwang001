const db = require('../../config/db');

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
  const [[row]] = await db.query(`SELECT id, role FROM users WHERE id = ?`, [userId]);
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
    `SELECT id, phone, nickname, email, role, created_at, last_login_at
     FROM users
     WHERE role IN ('admin', 'super_admin', 'disabled')
     ORDER BY created_at DESC`,
  );
  return rows;
}

async function selectAdminUserById(userId) {
  const [[row]] = await db.query(
    `SELECT id, phone, nickname, email, role, created_at, last_login_at FROM users WHERE id = ? AND role IN ('admin','super_admin','disabled')`,
    [userId],
  );
  return row || null;
}

async function insertAdminUser(id, phone, passwordHash, nickname, role) {
  const inviteCode = id.replace(/-/g, '').slice(0, 8).toUpperCase();
  await db.query(
    `INSERT INTO users (id, phone, password_hash, nickname, role, invite_code) VALUES (?,?,?,?,?,?)`,
    [id, phone, passwordHash, nickname || '管理员', role || 'admin', inviteCode],
  );
}

async function updateAdminUserEnabled(userId, enabled) {
  const role = enabled ? 'admin' : 'disabled';
  await db.query(`UPDATE users SET role = ? WHERE id = ? AND role IN ('admin','disabled')`, [role, userId]);
}

async function softDeleteAdminUser(userId) {
  await db.query(`UPDATE users SET role = 'disabled', deleted_at = NOW() WHERE id = ? AND role IN ('admin','disabled')`, [userId]);
}

async function updatePasswordHash(userId, hash) {
  await db.query(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, userId]);
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
  selectRolesForUser,
  listAdminUsers,
  selectAdminUserById,
  insertAdminUser,
  updateAdminUserEnabled,
  softDeleteAdminUser,
  updatePasswordHash,
  insertRole,
  updateRoleById,
  deleteRoleById,
  replaceRolePermissions,
};

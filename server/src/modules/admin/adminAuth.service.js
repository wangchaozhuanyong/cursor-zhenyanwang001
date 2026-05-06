const { BusinessError } = require('../../errors/BusinessError');
const authApi = require('../auth/auth.api');
const { comparePassword, signToken } = require('../../utils/helpers');
const { logAdminAction } = require('../../utils/adminAudit');
const { writeAuditLog } = require('../../utils/auditLog');
const rbacService = require('./rbac.service');
const { buildPhoneLookupCandidates } = require('../../utils/phone');

async function login(body, req) {
  const phone = body.phone || body.username;
  const countryCode = body.countryCode;
  const { password } = body;
  try {
    if (!phone || !password) throw new BusinessError(400, '手机号和密码不能为空');

    const user = await authApi.findUserByPhones(buildPhoneLookupCandidates(phone, countryCode));
    if (!user) throw new BusinessError(401, '手机号或密码错误');

    let hash = user.password_hash;
    if (Buffer.isBuffer(hash)) hash = hash.toString('utf8');
    else if (hash != null && typeof hash !== 'string') hash = String(hash);
    if (typeof hash !== 'string' || !hash.trim()) {
      throw new BusinessError(401, '手机号或密码错误');
    }

    let match = false;
    try {
      match = await comparePassword(password, hash);
    } catch (e) {
      console.error('[adminAuth.login] bcrypt compare error', e);
      match = false;
    }
    if (!match) throw new BusinessError(401, '手机号或密码错误');

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new BusinessError(403, '该账号无管理员权限');
    }

    const uid = String(user.id ?? '');
    if (!uid) throw new BusinessError(401, '手机号或密码错误');

    const rv = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
    const token = signToken(uid, rv);
    const access = await rbacService.getAccessContext(uid, user.role);
    try { await authApi.updateLastLogin(uid); } catch { /* non-critical */ }
    await logAdminAction(user.nickname || phone, '管理员登录', '');
    await writeAuditLog({
      req,
      operatorId: uid,
      operatorName: user.nickname || phone,
      operatorRole: user.role,
      actionType: 'admin.login',
      objectType: 'auth',
      objectId: uid,
      summary: '管理员登录成功',
      result: 'success',
    });
    return {
      data: {
        token,
        userId: uid,
        role: String(user.role || ''),
        permissions: access.permissions,
        isSuperAdmin: access.isSuperAdmin,
        roleCodes: access.roleCodes,
      },
      message: '登录成功',
    };
  } catch (err) {
    await writeAuditLog({
      req,
      operatorId: null,
      operatorName: phone || '',
      operatorRole: '',
      actionType: 'admin.login',
      objectType: 'auth',
      objectId: null,
      summary: '管理员登录失败',
      result: 'failure',
      errorMessage: err.message || String(err),
    });
    throw err;
  }
}

async function logout(userId, req) {
  if (userId) {
    await authApi.bumpRefreshTokenVersion(userId);
  }
  await logAdminAction(userId, '管理员退出', '');
  await writeAuditLog({
    req,
    operatorId: userId || null,
    actionType: 'admin.logout',
    objectType: 'auth',
    objectId: userId || null,
    summary: '管理员退出登录',
    result: 'success',
  });
  return { data: null, message: '已退出登录' };
}

module.exports = { login, logout };

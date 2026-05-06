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

    const match = await comparePassword(password, user.password_hash);
    if (!match) throw new BusinessError(401, '手机号或密码错误');

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new BusinessError(403, '该账号无管理员权限');
    }

    const rv = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
    const token = signToken(user.id, rv);
    const access = await rbacService.getAccessContext(user.id, user.role);
    try { await authApi.updateLastLogin(user.id); } catch { /* non-critical */ }
    await logAdminAction(user.nickname || phone, '管理员登录', '');
    await writeAuditLog({
      req,
      operatorId: user.id,
      operatorName: user.nickname || phone,
      operatorRole: user.role,
      actionType: 'admin.login',
      objectType: 'auth',
      objectId: user.id,
      summary: '管理员登录成功',
      result: 'success',
    });
    return {
      data: {
        token,
        userId: user.id,
        role: user.role,
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

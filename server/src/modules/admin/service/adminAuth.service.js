const { BusinessError } = require('../../../errors/BusinessError');
const { AuthError } = require('../../../errors');
const authModule = require('../../auth');
const { comparePassword, signToken, verifyToken } = require('../../../utils/helpers');
const { logAdminAction } = require('../../../utils/adminAudit');
const { writeAuditLog } = require('../../../utils/auditLog');
const rbacService = require('./rbac.service');
const { buildPhoneLookupCandidates } = require('../../../utils/phone');

const authApi = /** @type {any} */ (authModule).api || {};

function requireAuthApi(name) {
  const fn = authApi[name];
  if (typeof fn !== 'function') {
    throw new Error(`Auth 模块 API 未暴露方法: ${name}`);
  }
  return fn;
}

function normalizeLoginAccount(input) {
  // Normalize full-width digits and spaces copied from IM tools/keyboards.
  return String(input || '')
    .replace(/[！-～]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0xFEE0))
    .replace(/\s+/g, '')
    .trim();
}

async function login(body, req) {
  const phone = normalizeLoginAccount(body.phone || body.username);
  const countryCode = body.countryCode;
  const password = String(body.password || '');
  try {
    if (!phone || !password) throw new BusinessError(400, '手机号和密码不能为空');

    const matchedUsers = await requireAuthApi('findUsersByPhones')(buildPhoneLookupCandidates(phone, countryCode));
    if (!matchedUsers.length) throw new BusinessError(401, '账号未注册');

    function coerceHash(hash) {
      let h = hash;
      if (Buffer.isBuffer(h)) h = h.toString('utf8');
      else if (h != null && typeof h !== 'string') h = String(h);
      return typeof h === 'string' && h.trim() ? h : '';
    }

    let user = null;
    try {
      for (let i = 0; i < matchedUsers.length; i += 1) {
        const cand = matchedUsers[i];
        const stored = coerceHash(cand.password_hash);
        if (!stored) continue;
        if (await comparePassword(password, stored)) {
          user = cand;
          break;
        }
      }
    } catch (e) {
      console.error('[adminAuth.login] bcrypt compare error', e);
      user = null;
    }
    if (!user) throw new BusinessError(401, '密码错误');

    if (user.role !== 'admin' && user.role !== 'super_admin') {
      throw new BusinessError(403, '该账号无管理员权限');
    }
    if (user.account_status === 'disabled' || user.account_status === 'blacklisted') {
      throw new BusinessError(403, '该管理员账号已被停用');
    }

    const uid = String(user.id ?? '');
    if (!uid) throw new BusinessError(401, '手机号或密码错误');

    const rv = Number.isFinite(Number(user.refresh_token_version)) ? Number(user.refresh_token_version) : 0;
    const token = signToken(uid, rv);
    const access = await rbacService.getAccessContext(uid, user.role);
    try { await requireAuthApi('updateLastLogin')(uid); } catch { /* non-critical */ }
    await logAdminAction(user.nickname || phone, 'admin login', '');
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

async function refresh(refreshToken) {
  if (!refreshToken) throw new BusinessError(401, '请先登录');
  let payload;
  try {
    payload = /** @type {{ type?: string, userId?: string }} */ (verifyToken(refreshToken));
  } catch {
    throw new BusinessError(401, '登录已过期，请重新登录');
  }
  if (payload.type !== 'refresh') throw new BusinessError(401, '登录已过期，请重新登录');

  const user = await requireAuthApi('getUserIdAndRole')(payload.userId);
  if (!user) throw new BusinessError(401, '用户不存在');
  if (user.role !== 'admin' && user.role !== 'super_admin') {
    throw new BusinessError(403, '无管理员权限');
  }
  if (user.account_status === 'disabled' || user.account_status === 'blacklisted') {
    throw new BusinessError(403, '该管理员账号已被停用');
  }

  try {
    return await requireAuthApi('refresh')(refreshToken);
  } catch (err) {
    if (err instanceof AuthError) throw new BusinessError(401, err.message || '登录已过期，请重新登录');
    throw err;
  }
}

async function logout(userId, req) {
  if (userId) {
    await requireAuthApi('bumpRefreshTokenVersion')(userId);
  }
  await logAdminAction(userId, 'admin logout', '');
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

module.exports = { login, refresh, logout };








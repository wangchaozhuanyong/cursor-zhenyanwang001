/**
 * 手机号 OTP：发送记录 + 校验登录（可自动注册无密码用户）
 */
const crypto = require('crypto');
const {
  generateId,
  generateInviteCode,
} = require('../../../utils/helpers');
const {
  ValidationError,
  AuthError,
  RateLimitError,
  ConflictError,
} = require('../../../errors');
const { normalizeIntlPhone, buildPhoneLookupCandidates } = require('../../../utils/phone');
const repo = require('../auth.repository');
const smsOtp = require('./smsOtp.adapter');
const authService = require('../auth.service');

const OTP_PURPOSE_LOGIN = 'login';
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_RESEND_INTERVAL_MS = 60 * 1000;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_PER_IP_PER_HOUR = Number(process.env.OTP_MAX_PER_IP_PER_HOUR || 30);

function hashOtp(code) {
  return crypto.createHash('sha256').update(String(code).trim(), 'utf8').digest('hex');
}

function generateSixDigitCode() {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(6, '0');
}

function hashUa(ua) {
  if (!ua || typeof ua !== 'string') return null;
  return crypto.createHash('sha256').update(ua, 'utf8').digest('hex');
}

async function sendOtp(body, reqMeta) {
  const { phone, countryCode } = body;
  const normalizedPhone = normalizeIntlPhone(phone, countryCode);
  if (!normalizedPhone) throw new ValidationError('手机号格式不正确');

  const now = Date.now();
  const hourAgo = new Date(now - 60 * 60 * 1000);

  const recent = await repo.countOtpSendsSince(normalizedPhone, hourAgo);
  if (recent >= OTP_MAX_PER_HOUR) {
    throw new RateLimitError('验证码发送次数过多，请一小时后再试');
  }

  const recentByIp = await repo.countOtpRequestsByIpSince(reqMeta.ip || null, hourAgo);
  if (recentByIp >= OTP_MAX_PER_IP_PER_HOUR) {
    throw new RateLimitError('验证码请求过于频繁，请一小时后再试');
  }

  const latest = await repo.selectLatestOtpSend(normalizedPhone, OTP_PURPOSE_LOGIN);
  if (
    latest
    && latest.send_status === 'sent'
    && !latest.consumed_at
    && new Date(latest.expires_at).getTime() > now
    && new Date(latest.created_at).getTime() > now - OTP_RESEND_INTERVAL_MS
  ) {
    throw new RateLimitError('发送过于频繁，请稍后再试');
  }

  const code = generateSixDigitCode();
  const codeHash = hashOtp(code);
  const expiresAt = new Date(now + OTP_TTL_MS);
  const logId = generateId();

  let sendStatus = 'failed';
  let errorMessage = '';
  try {
    await smsOtp.sendLoginOtp({ phoneE164: normalizedPhone, code });
    sendStatus = 'sent';
  } catch (e) {
    errorMessage = e instanceof Error ? e.message : String(e);
    await repo.insertOtpSendLog({
      id: logId,
      phoneE164: normalizedPhone,
      purpose: OTP_PURPOSE_LOGIN,
      codeHash,
      ip: reqMeta.ip || null,
      uaHash: hashUa(reqMeta.userAgent),
      sendStatus: 'failed',
      errorMessage,
      expiresAt,
    });
    throw e;
  }

  await repo.insertOtpSendLog({
    id: logId,
    phoneE164: normalizedPhone,
    purpose: OTP_PURPOSE_LOGIN,
    codeHash,
    ip: reqMeta.ip || null,
    uaHash: hashUa(reqMeta.userAgent),
    sendStatus,
    errorMessage: null,
    expiresAt,
  });

  const expose =
    process.env.NODE_ENV !== 'production'
    && String(process.env.EXPOSE_OTP_CODE || '').toLowerCase() === 'true';

  return {
    data: expose ? { devOtp: code, expiresInSeconds: Math.floor(OTP_TTL_MS / 1000) } : null,
    message: expose ? '验证码已生成（仅开发环境显示）' : '验证码已发送',
  };
}

async function loginWithOtp(body) {
  const { phone, countryCode, code } = body;
  const normalizedPhone = normalizeIntlPhone(phone, countryCode);
  if (!normalizedPhone) throw new ValidationError('手机号格式不正确');
  if (!code || String(code).trim().length < 4) throw new ValidationError('验证码无效');

  const codeHash = hashOtp(code);
  const row = await repo.selectOtpLogForVerify(normalizedPhone, OTP_PURPOSE_LOGIN, codeHash);
  if (!row) throw new AuthError('验证码无效或已过期');

  const consumed = await repo.tryConsumeOtpRow(row.id);
  if (!consumed) throw new AuthError('验证码无效或已过期');

  const lookupPhones = buildPhoneLookupCandidates(phone, countryCode);
  let user = await repo.findUserByPhones(lookupPhones);

  if (!user) {
    const id = generateId();
    const invite = generateInviteCode();
    const nickname = `用户${normalizedPhone.replace(/\D/g, '').slice(-4) || '新'}`;
    try {
      await repo.insertUser({
        id,
        phone: normalizedPhone,
        passwordHash: null,
        nickname,
        inviteCode: invite,
        parentInviteCode: '',
      });
    } catch (err) {
      if (err && (err.code === 'ER_DUP_ENTRY' || err.errno === 1062)) {
        throw new ConflictError('该手机号已注册');
      }
      throw err;
    }

    const autoPromoteFirstUser = process.env.AUTO_PROMOTE_FIRST_USER_TO_ADMIN === '1';
    if (autoPromoteFirstUser) {
      const userCount = await repo.countUsers();
      if (userCount === 1) {
        await repo.setUserRole(id, 'admin');
      }
    }

    user = await repo.findUserByPhones([normalizedPhone]);
    if (!user) throw new AuthError('登录失败，请重试');
  }

  return authService.issueLoginForUserId(user.id);
}

module.exports = {
  isOtpLoginAvailable: smsOtp.isLoginOtpAvailable,
  sendOtp,
  loginWithOtp,
  OTP_PURPOSE_LOGIN,
};

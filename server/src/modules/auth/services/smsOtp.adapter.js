/**
 * 短信 OTP 发送适配器：开发环境可控制台输出；生产环境须配置真实通道。
 * 后续接入供应商时在此实现 HTTP 调用，不改变上层 otp.service 契约。
 */

const { ValidationError } = require('../../../errors');

/**
 * @param {{ phoneE164: string, code: string }} params
 * @returns {Promise<{ ok: true } | { ok: false, message: string }>}
 */
async function sendLoginOtp(params) {
  const isProd = process.env.NODE_ENV === 'production';
  const { phoneE164, code } = params;

  if (isProd) {
    const enabled = String(process.env.SMS_LOGIN_ENABLED || '').toLowerCase() === '1';
    if (!enabled) {
      throw new ValidationError('短信验证码登录未在生产环境启用（需设置 SMS_LOGIN_ENABLED=1 并配置供应商）');
    }
    /** 占位：生产启用后在此调用 Twilio / 阿里云等 */
    throw new ValidationError('短信服务尚未接入供应商，请联系管理员');
  }

  console.info(`[sms-otp][dev] ${phoneE164} 验证码：${code}`);
  return { ok: true };
}

module.exports = {
  sendLoginOtp,
};

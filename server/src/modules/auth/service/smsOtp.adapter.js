/**
 * 短信 OTP 发送适配器：开发环境默认控制台输出；生产环境必须显式启用并配置真实通道。
 *
 * 支持两类无需额外 npm 依赖的生产通道：
 * - SMS_PROVIDER=twilio：通过 Twilio REST API 发送
 * - SMS_PROVIDER=http：通过通用 HTTP JSON/form 网关发送
 */

const { ValidationError, ServiceUnavailableError } = require('../../../errors');

const DEFAULT_MESSAGE_TEMPLATE = 'Your verification code is {{code}}. It expires in 5 minutes.';
const DEFAULT_TIMEOUT_MS = 8000;

function truthy(value) {
  return ['1', 'true', 'yes', 'on'].includes(String(value || '').toLowerCase());
}

function renderTemplate(template, values) {
  return String(template || '').replace(/\{\{\s*(phone|code|message)\s*\}\}/g, (_, key) => values[key] || '');
}

function buildMessage(phoneE164, code) {
  const template = process.env.SMS_OTP_MESSAGE_TEMPLATE || DEFAULT_MESSAGE_TEMPLATE;
  return renderTemplate(template, { phone: phoneE164, code, message: '' });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new ValidationError(`短信服务配置缺失：${name}`);
  return value;
}

function getProvider() {
  const explicit = String(process.env.SMS_PROVIDER || '').trim().toLowerCase();
  if (explicit) return explicit;
  if (process.env.TWILIO_ACCOUNT_SID || process.env.TWILIO_AUTH_TOKEN) return 'twilio';
  if (process.env.SMS_HTTP_URL) return 'http';
  return '';
}

function isLoginOtpAvailable() {
  if (process.env.NODE_ENV !== 'production') return true;
  if (!truthy(process.env.SMS_LOGIN_ENABLED)) return false;

  const provider = getProvider();
  if (provider === 'twilio') {
    return Boolean(
      process.env.TWILIO_ACCOUNT_SID
        && process.env.TWILIO_AUTH_TOKEN
        && (process.env.TWILIO_FROM || process.env.TWILIO_MESSAGING_SERVICE_SID),
    );
  }
  if (provider === 'http') {
    const method = String(process.env.SMS_HTTP_METHOD || 'POST').toUpperCase();
    return Boolean(process.env.SMS_HTTP_URL && (method === 'GET' || process.env.SMS_HTTP_BODY_TEMPLATE));
  }
  return false;
}

async function fetchWithTimeout(url, options) {
  if (typeof fetch !== 'function') {
    throw new ValidationError('当前 Node.js 版本不支持 fetch，无法发送短信');
  }

  const timeoutMs = Number(process.env.SMS_HTTP_TIMEOUT_MS || DEFAULT_TIMEOUT_MS);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (e) {
    if (e?.name === 'AbortError') {
      throw new ServiceUnavailableError('短信服务请求超时');
    }
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * @param {{ phoneE164: string, code: string, message: string }} params
 * @returns {Promise<{ ok: true }>}
 */
async function sendViaTwilio({ phoneE164, code, message }) {
  const sid = requireEnv('TWILIO_ACCOUNT_SID');
  const token = requireEnv('TWILIO_AUTH_TOKEN');
  const from = process.env.TWILIO_FROM;
  const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

  if (!from && !messagingServiceSid) {
    throw new ValidationError('短信服务配置缺失：TWILIO_FROM 或 TWILIO_MESSAGING_SERVICE_SID');
  }

  const body = new URLSearchParams({
    To: phoneE164,
    Body: message,
  });
  if (messagingServiceSid) body.set('MessagingServiceSid', messagingServiceSid);
  else body.set('From', from);

  const res = await fetchWithTimeout(
    `https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(sid)}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    },
  );

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new ServiceUnavailableError(`短信服务发送失败（Twilio ${res.status}${text ? `: ${text.slice(0, 160)}` : ''}）`);
  }

  return { ok: true };
}

function parseHeadersJson() {
  const raw = String(process.env.SMS_HTTP_HEADERS_JSON || '').trim();
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('headers must be an object');
    }
    return parsed;
  } catch (e) {
    throw new ValidationError('短信服务配置无效：SMS_HTTP_HEADERS_JSON 必须是 JSON 对象');
  }
}

/**
 * @param {{ phoneE164: string, code: string, message: string }} params
 * @returns {Promise<{ ok: true }>}
 */
async function sendViaHttp({ phoneE164, code, message }) {
  const rawUrl = requireEnv('SMS_HTTP_URL');
  const values = { phone: phoneE164, code, message };
  const url = renderTemplate(rawUrl, values);
  const method = String(process.env.SMS_HTTP_METHOD || 'POST').toUpperCase();
  const headers = {
    'Content-Type': 'application/json',
    ...parseHeadersJson(),
  };

  let body;
  if (method !== 'GET') {
    const template = requireEnv('SMS_HTTP_BODY_TEMPLATE');
    body = renderTemplate(template, values);
  }

  const res = await fetchWithTimeout(url, { method, headers, body });
  const text = await res.text().catch(() => '');

  if (!res.ok) {
    throw new ServiceUnavailableError(`短信服务发送失败（HTTP ${res.status}${text ? `: ${text.slice(0, 160)}` : ''}）`);
  }

  const successRegex = String(process.env.SMS_HTTP_SUCCESS_REGEX || '').trim();
  if (successRegex && !new RegExp(successRegex).test(text)) {
    throw new ServiceUnavailableError('短信服务响应未通过成功条件校验');
  }

  return { ok: true };
}

/**
 * @param {{ phoneE164: string, code: string }} params
 * @returns {Promise<{ ok: true } | { ok: false, message: string }>}
 */
async function sendLoginOtp(params) {
  const isProd = process.env.NODE_ENV === 'production';
  const { phoneE164, code } = params;

  if (isProd) {
    if (!truthy(process.env.SMS_LOGIN_ENABLED)) {
      throw new ValidationError('短信验证码登录未在生产环境启用（需设置 SMS_LOGIN_ENABLED=1 并配置供应商）');
    }

    const message = buildMessage(phoneE164, code);
    const provider = getProvider();
    if (provider === 'twilio') return sendViaTwilio({ phoneE164, code, message });
    if (provider === 'http') return sendViaHttp({ phoneE164, code, message });
    throw new ValidationError('短信服务尚未配置供应商（SMS_PROVIDER=twilio 或 SMS_PROVIDER=http）');
  }

  console.info(`[sms-otp][dev] ${phoneE164} 验证码：${code}`);
  return { ok: true };
}

module.exports = {
  isLoginOtpAvailable,
  sendLoginOtp,
};

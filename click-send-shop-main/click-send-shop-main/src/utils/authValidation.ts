export type SupportedCountryCode = "+60" | "+86";

export function normalizeCountryCode(countryCode: string): SupportedCountryCode | "" {
  const digits = String(countryCode || "").replace(/\D+/g, "");
  if (digits === "60") return "+60";
  if (digits === "86") return "+86";
  return "";
}

export function normalizePhoneDigits(phone: string, countryCode: string): string {
  const cc = normalizeCountryCode(countryCode);
  let digits = String(phone || "").replace(/\D+/g, "");
  if (!digits) return "";

  if (cc === "+60") {
    if (digits.startsWith("60")) digits = digits.slice(2);
    digits = digits.replace(/^0+/, "");
  }
  if (cc === "+86") {
    if (digits.startsWith("86")) digits = digits.slice(2);
    digits = digits.replace(/^0+/, "");
  }
  return digits;
}

export function validatePhoneForCountry(phone: string, countryCode: string): string | null {
  const cc = normalizeCountryCode(countryCode);
  if (!cc) return "请选择正确的国家或地区代码";
  const digits = normalizePhoneDigits(phone, cc);
  if (!digits) return "请填写手机号";
  if (cc === "+60" && !/^1\d{8,9}$/.test(digits)) {
    return "马来西亚手机号格式不正确，请输入 9-10 位本地手机号，例如 0123456789";
  }
  if (cc === "+86" && !/^1[3-9]\d{9}$/.test(digits)) {
    return "中国手机号格式不正确，请输入 11 位手机号";
  }
  return null;
}

export function validateStrongPassword(password: string): string | null {
  if (!password) return "请填写密码";
  if (password.length < 8) return "密码至少 8 位，并包含大写字母、小写字母和数字";
  if (password.length > 64) return "密码不能超过 64 位";
  if (!/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/\d/.test(password)) {
    return "密码必须包含大写字母、小写字母和数字";
  }
  return null;
}

const AUTH_ERROR_MAP: Record<string, string> = {
  "Authentication failed": "手机号或密码不正确",
  "Phone already registered": "该手机号已注册，请直接登录",
  "Invalid input": "填写信息不正确，请检查后重试",
  "Invalid phone number": "手机号格式不正确",
  "Invalid invite code": "邀请码不存在或不可用",
  "Password reset token is invalid": "重置令牌无效，请重新申请",
  "Password reset token has expired": "重置令牌已过期，请重新申请",
  "Request failed (400)": "填写信息不正确，请检查后重试",
  "Request failed (401)": "手机号或密码不正确",
  "Request failed (409)": "该手机号已注册，请直接登录",
  NetworkError: "网络连接失败，请检查网络设置",
  "Failed to fetch": "网络连接失败，请检查网络设置",
};

export function authErrorMessage(error: unknown, fallback: string): string {
  const raw = error instanceof Error ? error.message : String(error || "");
  const message = raw.trim();
  if (!message) return fallback;
  if (AUTH_ERROR_MAP[message]) return AUTH_ERROR_MAP[message];
  if (/phone already registered/i.test(message)) return AUTH_ERROR_MAP["Phone already registered"];
  if (/authentication failed|invalid phone or password|invalid credentials/i.test(message)) {
    return AUTH_ERROR_MAP["Authentication failed"];
  }
  if (/invalid input/i.test(message)) return AUTH_ERROR_MAP["Invalid input"];
  if (/password/i.test(message) && /uppercase|lowercase|digit|number|least/i.test(message)) {
    return "密码至少 8 位，并包含大写字母、小写字母和数字";
  }
  if (/network|fetch/i.test(message)) return AUTH_ERROR_MAP.NetworkError;
  return message;
}

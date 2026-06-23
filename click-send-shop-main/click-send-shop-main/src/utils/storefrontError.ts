import { ApiError } from "@/types/common";
import { isInternalStorefrontCopy } from "@/utils/storefrontCopySanitizer";

/** 网关/网络类错误（502/503/504/0） */
export function isTransientStorefrontError(error: unknown): boolean {
  if (error instanceof ApiError) {
    return error.status === 0 || error.status === 502 || error.status === 503 || error.status === 504;
  }
  const msg = error instanceof Error ? error.message : String(error ?? "");
  return /服务暂时不可用|服务维护中|服务响应超时|网络连接失败|请求失败（502）|请求失败（503）|请求失败（504）/i.test(msg);
}

export function isTransientErrorMessage(message: string): boolean {
  return isTransientStorefrontError(new Error(message));
}

export function storefrontErrorHint(message: string): string | null {
  if (/Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+\/?api\/|\/api\/|Unexpected token|<!doctype html>/i.test(message)) {
    return "页面数据暂时没有同步成功，可以重试或先浏览其他内容。";
  }
  if (/网络连接失败|Failed to fetch/i.test(message)) {
    return "请检查网络连接后重试，或稍后再访问。";
  }
  if (/服务维护中/i.test(message)) {
    return "商城正在维护，请稍后再试。";
  }
  if (/服务响应超时/i.test(message)) {
    return "服务器响应较慢，请稍后重试。";
  }
  if (/服务暂时不可用|502|503|504/i.test(message)) {
    return "商城服务暂时无法连接，请稍后重试或联系客服。";
  }
  return null;
}

export function storefrontDisplayErrorMessage(message: string, fallback = "内容暂时没有加载成功"): string {
  const raw = message?.trim();
  if (!raw) return fallback;
  if (/Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+\/?api\/products|\/products\?/i.test(raw)) {
    return "商品列表暂时没有加载成功";
  }
  if (/Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+\/?api\/marketing|\/marketing\/promotions/i.test(raw)) {
    return "优惠活动暂时没有加载成功";
  }
  if (/^address:\s*Invalid input$/i.test(raw)) return "收货地址信息不完整，请检查后重试";
  if (/^(name|contact_name|recipient):\s*Invalid input$/i.test(raw)) return "收货人信息不完整，请检查后重试";
  if (/^(phone|mobile):\s*Invalid input$/i.test(raw)) return "手机号格式不正确";
  if (/^[a-zA-Z0-9_.-]+:\s*Invalid input$/i.test(raw)) return "填写信息不正确，请检查后重试";
  if (
    /Cannot\s+(GET|POST|PUT|PATCH|DELETE)\s+\/?api\/|\/api\/|Unexpected token|<!doctype html>|TypeError:|404 Not Found|Failed to fetch/i.test(raw)
    || isInternalStorefrontCopy(raw)
  ) {
    return fallback;
  }
  return raw;
}

export function adminLoginErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "无法连接服务器，请确认后端已启动且网络正常";
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return "管理后台服务暂时不可用，请稍后重试或联系技术支持";
    }
    if (/MFA required/i.test(error.message)) return "需要多因素身份验证，请输入身份验证器验证码";
    if (/MFA code invalid|Invalid or expired verification code|验证码不正确/i.test(error.message)) {
      return "验证码不正确，请使用身份验证器当前显示的 6 位数字";
    }
    if (/MFA challenge expired|多因素验证已过期/i.test(error.message)) {
      return "验证已过期，请点击「返回密码登录」后重新登录";
    }
    if (/MFA challenge invalid|多因素验证会话无效/i.test(error.message)) {
      return "验证会话无效，请点击「返回密码登录」后重新登录";
    }
    if (/MFA secret invalid|reset MFA|Unsupported state or unable to authenticate/i.test(error.message)) {
      return "身份验证器绑定已失效，请联系管理员重置 MFA 后重新绑定";
    }
    if (/MFA setup required|请先完成多因素身份验证绑定/i.test(error.message)) {
      return "请先完成多因素身份验证绑定";
    }
    if (error.status === 401) return "账号或密码不正确";
    if (error.status === 403) return "该账号无权登录管理后台";
    if (error.status === 429) return "登录尝试过于频繁，请稍后再试";
  }
  const msg = error instanceof Error ? error.message : "";
  if (/服务暂时不可用|服务维护|服务响应超时/i.test(msg)) {
    return "管理后台服务暂时不可用，请稍后重试或联系技术支持";
  }
  if (/网络连接失败|Failed to fetch/i.test(msg)) {
    return "无法连接服务器，请确认后端已启动且网络正常";
  }
  if (/Authentication failed|invalid credentials|密码|账号/i.test(msg)) {
    return "账号或密码不正确";
  }
  if (/MFA required|需要多因素身份验证/i.test(msg)) return "需要多因素身份验证，请输入身份验证器验证码";
  if (/MFA code invalid|Invalid or expired verification code|验证码不正确/i.test(msg)) {
    return "验证码不正确，请使用身份验证器当前显示的 6 位数字";
  }
  if (/MFA challenge expired|多因素验证已过期/i.test(msg)) {
    return "验证已过期，请点击「返回密码登录」后重新登录";
  }
  if (/MFA challenge invalid|多因素验证会话无效/i.test(msg)) {
    return "验证会话无效，请点击「返回密码登录」后重新登录";
  }
  if (/MFA secret invalid|reset MFA|Unsupported state or unable to authenticate/i.test(msg)) {
    return "身份验证器绑定已失效，请联系管理员重置 MFA 后重新绑定";
  }
  if (/MFA setup required|请先完成多因素身份验证绑定/i.test(msg)) return "请先完成多因素身份验证绑定";
  if (/MFA verification failed/i.test(msg)) return "多因素验证失败，请检查验证码是否正确或是否已过期";
  return fallback;
}

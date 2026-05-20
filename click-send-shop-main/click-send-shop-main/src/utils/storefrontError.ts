import { ApiError } from "@/types/common";

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

export function adminLoginErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return "无法连接服务器，请确认后端已启动且网络正常";
    if (error.status === 502 || error.status === 503 || error.status === 504) {
      return "管理后台服务暂时不可用，请稍后重试或联系技术支持";
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
  return fallback;
}

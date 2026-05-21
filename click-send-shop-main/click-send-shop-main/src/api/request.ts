import type { ApiResponse } from "@/types/common";
import { ApiError } from "@/types/common";
import {
  getAccessToken,
  setAccessToken,
  clearTokens,
  getAdminAccessToken,
  clearAdminTokens,
} from "@/utils/token";
import { normalizeMediaUrls } from "@/utils/mediaUrl";
import { notifyAuthExpired } from "@/lib/authSessionBridge";
import { startGlobalLoadingDeferred, stopGlobalLoading } from "@/lib/loadingProgress";
import { clearAdminCsrfToken, getAdminCsrfToken, setAdminCsrfToken } from "@/lib/adminCsrf";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

type LoadingMode = "global" | "silent";
export type RequestOptions = RequestInit & {
  skipGlobalLoading?: boolean;
  loadingMode?: LoadingMode;
  /** 401 时不尝试 refresh 重试，避免无效会话下重复请求（如购物车静默拉取） */
  skipAuthRetry?: boolean;
};

function gatewayErrorMessage(status: number): string | null {
  if (status === 502) return "服务暂时不可用，请稍后重试";
  if (status === 503) return "服务维护中，请稍后再试";
  if (status === 504) return "服务响应超时，请稍后再试";
  return null;
}

function translateApiMessage(message: string): string {
  if (/^Authentication failed$/i.test(message)) return "手机号或密码不正确";
  if (/phone already registered/i.test(message)) return "该手机号已注册，请直接登录";
  if (/^Invalid input$/i.test(message)) return "填写信息不正确，请检查后重试";
  if (/invalid phone/i.test(message)) return "手机号格式不正确";
  if (/invalid invite/i.test(message)) return "邀请码不存在或不可用";
  if (/password/i.test(message) && /uppercase|lowercase|digit|number|least/i.test(message)) {
    return "密码至少 8 位，并包含大写字母、小写字母和数字";
  }
  return message;
}

function extractResponseMessage(body: Record<string, unknown>, status: number): string {
  const gateway = gatewayErrorMessage(status);
  if (gateway) return gateway;
  const candidates = [
    body.message,
    body.error,
    body.msg,
    (body.data as Record<string, unknown> | undefined)?.message,
    (body.data as Record<string, unknown> | undefined)?.error,
  ];
  const message = candidates.find((v) => typeof v === "string" && v.trim());
  return typeof message === "string" ? translateApiMessage(message) : `请求失败（${status}）`;
}

export function toQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== "");
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

let refreshing: Promise<string> | null = null;
let adminRefreshing: Promise<void> | null = null;
const ADMIN_CSRF_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

function isPublicStorefrontPath(pathname: string): boolean {
  return pathname === "/"
    || pathname.startsWith("/categories")
    || pathname.startsWith("/new-arrivals")
    || pathname.startsWith("/search")
    || pathname.startsWith("/product/")
    || pathname.startsWith("/help")
    || pathname.startsWith("/about")
    || pathname.startsWith("/content/")
    || pathname.startsWith("/support-download")
    || pathname.startsWith("/install");
}

function shouldRedirectToLogin(options: RequestOptions, isAuthLogout: boolean, isAccountCancel: boolean): boolean {
  if (typeof window === "undefined") return false;
  if (isAuthLogout || isAccountCancel || window.location.pathname.startsWith("/login")) return false;
  if (options.skipGlobalLoading || options.loadingMode === "silent") {
    return !isPublicStorefrontPath(window.location.pathname);
  }
  return true;
}

async function tryRefreshToken(): Promise<string> {
  const loadingToken = startGlobalLoadingDeferred();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
  } finally {
    stopGlobalLoading(loadingToken);
  }

  if (!res.ok) {
    clearTokens();
    throw new ApiError(401, "登录已过期，请重新登录");
  }

  const body = (await res.json()) as ApiResponse<{ accessToken: string }>;
  const newToken = body.data.accessToken || "";
  setAccessToken(newToken);
  return newToken;
}

export async function tryRefreshAdminSession(): Promise<void> {
  const loadingToken = startGlobalLoadingDeferred();
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/admin/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
    });
  } finally {
    stopGlobalLoading(loadingToken);
  }

  if (!res.ok) {
    clearAdminTokens();
    clearAdminCsrfToken();
    throw new ApiError(401, "登录已过期，请重新登录");
  }

  try {
    const body = (await res.clone().json()) as ApiResponse<{ csrfToken?: string }>;
    setAdminCsrfToken(body.data?.csrfToken);
  } catch {
    // Ignore malformed refresh payloads; the next mutation can fetch a token.
  }
}

async function request<T>(endpoint: string, options: RequestOptions = {}, retry = true): Promise<T> {
  const isSilent = options.skipGlobalLoading || options.loadingMode === "silent";
  const loadingToken = isSilent ? null : startGlobalLoadingDeferred();

  const isAdminEndpoint = endpoint.startsWith("/admin/");
  const isAuthLoginOrRegister =
    endpoint.startsWith("/auth/login")
    || endpoint.startsWith("/auth/register")
    || endpoint.startsWith("/auth/otp/login")
    || endpoint.startsWith("/auth/oauth/exchange");
  const isAuthLogout = endpoint.startsWith("/auth/logout");
  const isAdminAuthLogin = endpoint.startsWith("/admin/auth/login");
  const isAdminAuthRefresh = endpoint.startsWith("/admin/auth/refresh");
  const isAdminCsrfEndpoint = endpoint.startsWith("/admin/auth/csrf");
  const isAccountCancel = endpoint.startsWith("/user/account/cancel");
  const token = isAdminEndpoint ? getAdminAccessToken() : getAccessToken();
  const method = String(options.method || "GET").toUpperCase();
  const needsAdminCsrf = isAdminEndpoint
    && ADMIN_CSRF_METHODS.has(method)
    && !isAdminAuthLogin
    && !isAdminAuthRefresh
    && !isAdminCsrfEndpoint;
  const csrfToken = needsAdminCsrf ? await getAdminCsrfToken() : "";

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    ...options.headers,
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
      credentials: "include",
    });
  } catch (err) {
    throw new ApiError(0, "网络连接失败，请检查网络设置", err);
  } finally {
    if (loadingToken) stopGlobalLoading(loadingToken);
  }

  if (res.status === 401 && retry && !options.skipAuthRetry && !isAdminEndpoint && !isAuthLoginOrRegister) {
    if (!refreshing) refreshing = tryRefreshToken().finally(() => { refreshing = null; });
    try {
      const newToken = await refreshing;
      const retryHeaders: HeadersInit = {
        ...headers,
        ...(newToken ? { Authorization: `Bearer ${newToken}` } : {}),
      };
      return request<T>(endpoint, { ...options, headers: retryHeaders }, false);
    } catch {
      clearTokens();
      notifyAuthExpired();
      if (shouldRedirectToLogin(options, isAuthLogout, isAccountCancel)) {
        window.location.href = "/login";
      }
      throw new ApiError(401, "登录已过期，请重新登录");
    }
  }

  if (res.status === 401 && retry && isAdminEndpoint && !isAdminAuthLogin && !isAdminAuthRefresh) {
    if (!adminRefreshing) {
      adminRefreshing = tryRefreshAdminSession().finally(() => { adminRefreshing = null; });
    }
    try {
      await adminRefreshing;
      return request<T>(endpoint, options, false);
    } catch {
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
      throw new ApiError(401, "登录已过期，请重新登录");
    }
  }

  if (!res.ok) {
    if (res.status === 401 && isAdminEndpoint) {
      clearAdminTokens();
      clearAdminCsrfToken();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    if (res.status === 401 && !isAdminEndpoint) {
      clearTokens();
      notifyAuthExpired();
    }
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      // ignore malformed error bodies
    }
    throw new ApiError(res.status, extractResponseMessage(body, res.status), {
      ...body,
      status: res.status,
      endpoint,
    });
  }

  const payload = (await res.json()) as T;
  return normalizeMediaUrls(payload, BASE_URL);
}

export function get<T>(endpoint: string, params?: Record<string, unknown>, options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode" | "skipAuthRetry">) {
  return request<ApiResponse<T>>(`${endpoint}${toQueryString(params)}`, {
    skipGlobalLoading: options?.skipGlobalLoading ?? true,
    loadingMode: options?.loadingMode ?? "silent",
    skipAuthRetry: options?.skipAuthRetry,
  });
}

export function post<T>(endpoint: string, body?: unknown, options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode">) {
  return request<ApiResponse<T>>(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    skipGlobalLoading: options?.skipGlobalLoading,
    loadingMode: options?.loadingMode,
  });
}

export function put<T>(endpoint: string, body?: unknown, options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode">) {
  return request<ApiResponse<T>>(endpoint, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
    skipGlobalLoading: options?.skipGlobalLoading,
    loadingMode: options?.loadingMode,
  });
}

export function patch<T>(endpoint: string, body?: unknown, options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode">) {
  return request<ApiResponse<T>>(endpoint, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
    skipGlobalLoading: options?.skipGlobalLoading,
    loadingMode: options?.loadingMode,
  });
}

export function del<T>(endpoint: string, options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode">) {
  return request<ApiResponse<T>>(endpoint, {
    method: "DELETE",
    skipGlobalLoading: options?.skipGlobalLoading,
    loadingMode: options?.loadingMode,
  });
}

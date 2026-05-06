import type { ApiResponse } from "@/types/common";
import { ApiError } from "@/types/common";
import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
  getAdminAccessToken,
  clearAdminTokens,
} from "@/utils/token";
import { normalizeMediaUrls } from "@/utils/mediaUrl";
import { notifyAuthExpired } from "@/lib/authSessionBridge";
import { startGlobalLoadingDeferred, stopGlobalLoading } from "@/lib/loadingProgress";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

function extractResponseMessage(body: Record<string, unknown>, status: number): string {
  const candidates = [
    body.message,
    body.error,
    body.msg,
    (body.data as Record<string, unknown> | undefined)?.message,
    (body.data as Record<string, unknown> | undefined)?.error,
  ];
  const message = candidates.find((v) => typeof v === "string" && v.trim());
  return typeof message === "string" ? message : `请求失败 (${status})`;
}

/* ─── query-string 工具 ─── */

export function toQueryString(params?: Record<string, unknown>): string {
  if (!params) return "";
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

/* ─── token 自动刷新队列 ─── */

let refreshing: Promise<string> | null = null;

async function tryRefreshToken(): Promise<string> {
  const loadingToken = startGlobalLoadingDeferred();
  const rt = getRefreshToken();
  if (!rt) {
    stopGlobalLoading(loadingToken);
    clearTokens();
    throw new ApiError(401, "登录已过期，请重新登录");
  }

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
  } finally {
    stopGlobalLoading(loadingToken);
  }

  if (!res.ok) {
    clearTokens();
    throw new ApiError(401, "登录已过期，请重新登录");
  }

  const body = (await res.json()) as ApiResponse<{ accessToken: string }>;
  const newToken = body.data.accessToken;
  setAccessToken(newToken);
  return newToken;
}

/* ─── 核心请求函数 ─── */

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const loadingToken = startGlobalLoadingDeferred();
  const isAdminEndpoint = endpoint.startsWith("/admin/");
  const isAuthLoginOrRegister =
    endpoint.startsWith("/auth/login")
    || endpoint.startsWith("/auth/register");
  const token = isAdminEndpoint ? getAdminAccessToken() : getAccessToken();

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${endpoint}`, { ...options, headers });
  } catch (err) {
    throw new ApiError(0, "网络连接失败，请检查网络设置", err);
  } finally {
    stopGlobalLoading(loadingToken);
  }

  if (res.status === 401 && retry && !isAdminEndpoint && !isAuthLoginOrRegister) {
    if (!refreshing) refreshing = tryRefreshToken().finally(() => { refreshing = null; });
    try {
      const newToken = await refreshing;
      const retryHeaders: HeadersInit = {
        ...headers,
        Authorization: `Bearer ${newToken}`,
      };
      return request<T>(endpoint, { ...options, headers: retryHeaders }, false);
    } catch {
      clearTokens();
      notifyAuthExpired();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.href = "/login";
      }
      throw new ApiError(401, "登录已过期，请重新登录");
    }
  }

  if (!res.ok) {
    if (res.status === 401 && isAdminEndpoint) {
      clearAdminTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
    }
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch { /* empty */ }
    throw new ApiError(res.status, extractResponseMessage(body, res.status), {
      ...body,
      status: res.status,
      endpoint,
    });
  }

  const payload = (await res.json()) as T;
  return normalizeMediaUrls(payload, BASE_URL);
}

/* ─── HTTP 方法封装 ─── */

export function get<T>(endpoint: string, params?: Record<string, unknown>) {
  return request<ApiResponse<T>>(`${endpoint}${toQueryString(params)}`);
}

export function post<T>(endpoint: string, body?: unknown) {
  return request<ApiResponse<T>>(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function put<T>(endpoint: string, body?: unknown) {
  return request<ApiResponse<T>>(endpoint, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function patch<T>(endpoint: string, body?: unknown) {
  return request<ApiResponse<T>>(endpoint, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
  });
}

export function del<T>(endpoint: string) {
  return request<ApiResponse<T>>(endpoint, { method: "DELETE" });
}

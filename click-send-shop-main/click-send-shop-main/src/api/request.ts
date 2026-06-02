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
import { clearAdminQueryCache } from "@/lib/queryClient";
import {
  getAdminMfaActionClassFromResponse,
  isAdminMfaRequiredResponse,
  requestAdminMfaStepUp,
} from "@/lib/adminMfaStepUp";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const ADMIN_SENSITIVE_ACTION_HEADER = "X-Admin-Sensitive-Action-Token";
const DEFAULT_READ_TIMEOUT_MS = 15_000;
const DEFAULT_WRITE_TIMEOUT_MS = 30_000;
const SESSION_REFRESH_TIMEOUT_MS = 12_000;

type LoadingMode = "global" | "silent";
export type RequestOptions = RequestInit & {
  skipGlobalLoading?: boolean;
  loadingMode?: LoadingMode;
  timeoutMs?: number;
  /** 401 时不尝试 refresh 重试，避免无效会话下重复请求（如购物车静默拉取） */
  skipAuthRetry?: boolean;
  /** 401 时不触发全局登出副作用（会话探测、公开页静默请求） */
  suppressAuthExpired?: boolean;
};

type TimedFetchInit = RequestInit & {
  timeoutMs?: number;
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

export function extractResponseMessage(body: Record<string, unknown>, status: number): string {
  const candidates = [
    body.message,
    body.error,
    body.msg,
    (body.data as Record<string, unknown> | undefined)?.message,
    (body.data as Record<string, unknown> | undefined)?.error,
  ];
  const message = candidates.find((v) => typeof v === "string" && v.trim());
  if (typeof message === "string") return translateApiMessage(message);
  const gateway = gatewayErrorMessage(status);
  return gateway || `请求失败（${status}）`;
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
const ADMIN_SESSION_EXPIRED_EVENT = "admin:session-expired";

function isAuthFailureStatus(status: number): boolean {
  return status === 401 || status === 403;
}

function isTransientRefreshError(err: unknown): boolean {
  return err instanceof ApiError && (err.code === 0 || err.code === 408 || err.code === 429 || err.code >= 500);
}

function isAbortError(err: unknown): boolean {
  if (typeof DOMException !== "undefined" && err instanceof DOMException && err.name === "AbortError") return true;
  if (err instanceof Error && err.name === "AbortError") return true;
  return false;
}

function defaultTimeoutMs(method?: string): number {
  const normalized = String(method || "GET").toUpperCase();
  return normalized === "GET" || normalized === "HEAD" ? DEFAULT_READ_TIMEOUT_MS : DEFAULT_WRITE_TIMEOUT_MS;
}

async function fetchWithTimeout(input: RequestInfo | URL, init: TimedFetchInit = {}): Promise<Response> {
  const {
    timeoutMs = defaultTimeoutMs(init.method),
    signal: externalSignal,
    ...fetchInit
  } = init;

  if ((!timeoutMs || timeoutMs <= 0) && !externalSignal) {
    return fetch(input, fetchInit);
  }

  const controller = new AbortController();
  let timedOut = false;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const abortFromExternalSignal = () => controller.abort();
  if (externalSignal?.aborted) {
    controller.abort();
  } else {
    externalSignal?.addEventListener("abort", abortFromExternalSignal, { once: true });
  }

  if (timeoutMs && timeoutMs > 0) {
    timeoutId = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeoutMs);
  }

  try {
    return await fetch(input, {
      ...fetchInit,
      signal: controller.signal,
    });
  } catch (err) {
    if (timedOut && isAbortError(err)) {
      throw new ApiError(408, "请求超时，请稍后重试", err);
    }
    throw err;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
    externalSignal?.removeEventListener("abort", abortFromExternalSignal);
  }
}

function isAdminMfaLoginVerifyEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("/admin/auth/mfa/verify");
}

function isAdminMfaReverifyEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("/admin/auth/mfa/reverify");
}

function isAdminPasskeyLoginEndpoint(endpoint: string): boolean {
  return endpoint.startsWith("/admin/auth/passkeys/login/")
    || endpoint.startsWith("/admin/auth/passkeys/authentication/");
}

function isAdminCsrfInvalidResponse(status: number, body: Record<string, unknown>): boolean {
  return status === 403 && /CSRF token invalid/i.test(extractResponseMessage(body, status));
}

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

function shouldSuppressAuthExpired(options: RequestOptions): boolean {
  if (options.suppressAuthExpired) return true;
  const silent = options.skipGlobalLoading || options.loadingMode === "silent";
  if (!silent || typeof window === "undefined") return false;
  return isPublicStorefrontPath(window.location.pathname);
}

function shouldRedirectToLogin(options: RequestOptions, isAuthLogout: boolean, isAccountCancel: boolean): boolean {
  if (typeof window === "undefined") return false;
  if (
    isAuthLogout
    || isAccountCancel
    || window.location.pathname.startsWith("/login")
    || window.location.pathname === "/register"
  ) return false;
  if (options.skipGlobalLoading || options.loadingMode === "silent") {
    return !isPublicStorefrontPath(window.location.pathname);
  }
  return true;
}

async function tryRefreshToken(): Promise<string> {
  const loadingToken = startGlobalLoadingDeferred();
  let res: Response;
  try {
    res = await fetchWithTimeout(`${BASE_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      timeoutMs: SESSION_REFRESH_TIMEOUT_MS,
      body: JSON.stringify({}),
    });
  } finally {
    stopGlobalLoading(loadingToken);
  }

  if (!res.ok) {
    if (isAuthFailureStatus(res.status)) {
      clearTokens();
      throw new ApiError(401, "登录已过期，请重新登录");
    }
    throw new ApiError(res.status, extractResponseMessage(await safeJson(res), res.status));
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
    res = await fetchWithTimeout(`${BASE_URL}/admin/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      timeoutMs: SESSION_REFRESH_TIMEOUT_MS,
      body: JSON.stringify({}),
    });
  } finally {
    stopGlobalLoading(loadingToken);
  }

  if (!res.ok) {
    if (isAuthFailureStatus(res.status)) {
      expireAdminSession("refresh-failed", { status: res.status });
      throw new ApiError(401, "登录已过期，请重新登录");
    }
    throw new ApiError(res.status, extractResponseMessage(await safeJson(res), res.status));
  }

  try {
    const body = (await res.clone().json()) as ApiResponse<{ csrfToken?: string }>;
    setAdminCsrfToken(body.data?.csrfToken);
  } catch {
    // Ignore malformed refresh payloads; the next mutation can fetch a token.
  }
}

function expireAdminSession(reason: string, data?: Record<string, unknown>): void {
  clearAdminTokens();
  clearAdminCsrfToken();
  useAdminPermissionStore.getState().clear();
  clearAdminQueryCache();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ADMIN_SESSION_EXPIRED_EVENT, { detail: { reason, ...data } }));
  }
}

function redirectToAdminLogin(reason: string): void {
  if (typeof window === "undefined" || window.location.pathname.startsWith("/admin/login")) return;
  expireAdminSession(reason);
  window.location.assign("/admin/login");
}

async function safeJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.clone().json()) as Record<string, unknown>;
  } catch {
    return {};
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
  const isAdminMfaEndpoint = endpoint.startsWith("/admin/auth/mfa/");
  const isAdminMfaLoginVerify = isAdminMfaLoginVerifyEndpoint(endpoint);
  const isAdminMfaReverify = isAdminMfaReverifyEndpoint(endpoint);
  const isAdminPasskeyEndpoint = endpoint.startsWith("/admin/auth/passkeys/");
  const isAdminPasskeyLogin = isAdminPasskeyLoginEndpoint(endpoint);
  const isAdminCsrfEndpoint = endpoint.startsWith("/admin/auth/csrf");
  const isAccountCancel = endpoint.startsWith("/user/account/cancel");
  const token = isAdminEndpoint ? getAdminAccessToken() : getAccessToken();
  const method = String(options.method || "GET").toUpperCase();
  const needsAdminCsrf = isAdminEndpoint
    && ADMIN_CSRF_METHODS.has(method)
    && !isAdminAuthLogin
    && !isAdminAuthRefresh
    && !isAdminMfaLoginVerify
    && !isAdminPasskeyLogin
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
    const {
      skipGlobalLoading: _skipGlobalLoading,
      loadingMode: _loadingMode,
      skipAuthRetry: _skipAuthRetry,
      suppressAuthExpired: _suppressAuthExpired,
      ...fetchOptions
    } = options;
    res = await fetchWithTimeout(`${BASE_URL}${endpoint}`, {
      ...fetchOptions,
      headers,
      credentials: "include",
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (isAbortError(err)) throw err;
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
    } catch (err) {
      if (isTransientRefreshError(err)) {
        throw err;
      }
      if (!shouldSuppressAuthExpired(options)) {
        clearTokens();
        notifyAuthExpired();
        if (shouldRedirectToLogin(options, isAuthLogout, isAccountCancel)) {
          window.location.href = "/login";
        }
      }
      throw new ApiError(401, "登录已过期，请重新登录");
    }
  }

  if (res.status === 401 && retry && isAdminEndpoint && !isAdminAuthLogin && !isAdminAuthRefresh && !isAdminMfaEndpoint && !isAdminPasskeyEndpoint) {
    if (!adminRefreshing) {
      adminRefreshing = tryRefreshAdminSession().finally(() => { adminRefreshing = null; });
    }
    try {
      await adminRefreshing;
      return request<T>(endpoint, options, false);
    } catch (err) {
      if (isTransientRefreshError(err)) {
        throw err;
      }
      redirectToAdminLogin("refresh-after-401-failed");
      throw new ApiError(401, "登录已过期，请重新登录");
    }
  }

  if (!res.ok) {
    let body: Record<string, unknown> = {};
    try {
      body = (await res.json()) as Record<string, unknown>;
    } catch {
      // ignore malformed error bodies
    }

    if (retry && needsAdminCsrf && isAdminCsrfInvalidResponse(res.status, body)) {
      clearAdminCsrfToken();
      const refreshedCsrfToken = await getAdminCsrfToken();
      return request<T>(
        endpoint,
        {
          ...options,
          headers: {
            ...(options.headers || {}),
            ...(refreshedCsrfToken ? { "X-CSRF-Token": refreshedCsrfToken } : {}),
          },
        },
        false,
      );
    }

    const mfaRequired = isAdminMfaRequiredResponse(res.status, body);
    if (
      retry
      && isAdminEndpoint
      && mfaRequired
      && typeof window !== "undefined"
      && !isAdminMfaLoginVerify
      && !isAdminMfaReverify
      && !isAdminPasskeyEndpoint
    ) {
      try {
        const stepUp = await requestAdminMfaStepUp(getAdminMfaActionClassFromResponse(body));
        const retryHeaders: HeadersInit = {
          ...headers,
          ...(stepUp.sensitiveActionToken ? { [ADMIN_SENSITIVE_ACTION_HEADER]: stepUp.sensitiveActionToken } : {}),
        };
        return request<T>(endpoint, { ...options, headers: retryHeaders }, false);
      } catch {
        throw new ApiError(403, extractResponseMessage(body, res.status), {
          ...body,
          mfaRequired: true,
          status: res.status,
          endpoint,
        });
      }
    }

    if (res.status === 401 && isAdminEndpoint && !isAdminMfaEndpoint && !isAdminPasskeyEndpoint) {
      redirectToAdminLogin("admin-401-no-retry");
    }
    if (res.status === 401 && !isAdminEndpoint && !shouldSuppressAuthExpired(options)) {
      clearTokens();
      notifyAuthExpired();
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

export function get<T>(
  endpoint: string,
  params?: Record<string, unknown>,
  options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode" | "signal" | "timeoutMs" | "skipAuthRetry" | "suppressAuthExpired">,
) {
  return request<ApiResponse<T>>(`${endpoint}${toQueryString(params)}`, {
    skipGlobalLoading: options?.skipGlobalLoading ?? true,
    loadingMode: options?.loadingMode ?? "silent",
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
    skipAuthRetry: options?.skipAuthRetry,
    suppressAuthExpired: options?.suppressAuthExpired,
  });
}

export function post<T>(
  endpoint: string,
  body?: unknown,
  options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode" | "signal" | "timeoutMs" | "skipAuthRetry" | "suppressAuthExpired">,
) {
  return request<ApiResponse<T>>(endpoint, {
    method: "POST",
    body: body ? JSON.stringify(body) : undefined,
    skipGlobalLoading: options?.skipGlobalLoading,
    loadingMode: options?.loadingMode,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
    skipAuthRetry: options?.skipAuthRetry,
    suppressAuthExpired: options?.suppressAuthExpired,
  });
}

export function put<T>(endpoint: string, body?: unknown, options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode" | "signal" | "timeoutMs">) {
  return request<ApiResponse<T>>(endpoint, {
    method: "PUT",
    body: body ? JSON.stringify(body) : undefined,
    skipGlobalLoading: options?.skipGlobalLoading,
    loadingMode: options?.loadingMode,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });
}

export function patch<T>(endpoint: string, body?: unknown, options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode" | "signal" | "timeoutMs">) {
  return request<ApiResponse<T>>(endpoint, {
    method: "PATCH",
    body: body ? JSON.stringify(body) : undefined,
    skipGlobalLoading: options?.skipGlobalLoading,
    loadingMode: options?.loadingMode,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });
}

export function del<T>(endpoint: string, options?: Pick<RequestOptions, "skipGlobalLoading" | "loadingMode" | "signal" | "timeoutMs">) {
  return request<ApiResponse<T>>(endpoint, {
    method: "DELETE",
    skipGlobalLoading: options?.skipGlobalLoading,
    loadingMode: options?.loadingMode,
    signal: options?.signal,
    timeoutMs: options?.timeoutMs,
  });
}

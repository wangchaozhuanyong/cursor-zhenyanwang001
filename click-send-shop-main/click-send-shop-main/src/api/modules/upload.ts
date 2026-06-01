import { tryRefreshAdminSession } from "@/api/request";
import {
  clearAdminTokens,
  clearTokens,
  getAccessToken,
  getAdminAccessToken,
  setAccessToken,
} from "@/utils/token";
import { normalizeMediaUrls } from "@/utils/mediaUrl";
import { getAdminCsrfToken } from "@/lib/adminCsrf";
import {
  getAdminMfaActionClassFromResponse,
  isAdminMfaRequiredResponse,
  requestAdminMfaStepUp,
} from "@/lib/adminMfaStepUp";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const ADMIN_SENSITIVE_ACTION_HEADER = "X-Admin-Sensitive-Action-Token";
const IMAGE_MAX_SIZE = 15 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/avif"];
const UPLOAD_STORAGE = ((import.meta.env.VITE_UPLOAD_STORAGE as string | undefined)?.toLowerCase() || "any") as
  | "s3"
  | "any";
/** 默认关闭；上线启用 S3 预签名时设 VITE_UPLOAD_PRESIGN=1 */
const PRESIGN_ENABLED = (import.meta.env.VITE_UPLOAD_PRESIGN as string | undefined) === "1";
const S3_HOST_ALLOWLIST =
  (import.meta.env.VITE_S3_PUBLIC_HOSTS as string | undefined)
    ?.split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean) ?? [];

type UploadStoragePayload = {
  url?: unknown;
  storageProvider?: unknown;
  storageKey?: unknown;
};

export type UploadProgressCallback = (percent: number) => void;
/** @deprecated 请用 product；服务端会将 image 视为 product */
export type UploadMode = "product" | "banner" | "thumb" | "asset" | "video" | "auto" | "image";
export type UploadRequestOptions = {
  onProgress?: UploadProgressCallback;
  timeoutMs?: number;
  adminMode?: boolean;
  signal?: AbortSignal;
  mode?: UploadMode;
  /** 强制 multipart，跳过预签名 */
  forceMultipart?: boolean;
};

type UploadEnvelope<T> = { code?: number; message?: string; data?: T; traceId?: string };

type UploadTicket = {
  uploadUrl: string;
  objectKey: string;
  mimeType: string;
  maxSize: number;
  expiresIn: number;
  expiresAt: string;
  mode: string;
};

function isS3PublicUrl(url: string): boolean {
  const raw = String(url || "").trim();
  if (!raw) return false;
  try {
    const parsed = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    const host = parsed.host.toLowerCase();
    if (S3_HOST_ALLOWLIST.length > 0) {
      return S3_HOST_ALLOWLIST.some((h) => host === h || host.endsWith(`.${h}`));
    }
    return host.endsWith(".amazonaws.com") || host.includes(".s3.") || host.endsWith(".cloudfront.net");
  } catch {
    return false;
  }
}

function isS3StorageProvider(value: unknown): boolean {
  return String(value || "").trim().toLowerCase() === "s3";
}

function inAdminContext() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

function extractMessageFromBody(body: Record<string, unknown>): string | undefined {
  const candidates = [body.message, body.error, body.msg];
  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return undefined;
}

function ensureS3WhenNeeded(upload: string | UploadStoragePayload): void {
  if (UPLOAD_STORAGE !== "s3") return;
  if (typeof upload !== "string" && isS3StorageProvider(upload.storageProvider)) return;
  const url = typeof upload === "string" ? upload : String(upload.url || "");
  if (!isS3PublicUrl(url)) {
    throw new Error("上传失败：当前环境要求 S3 存储，但返回了非 S3 地址。请检查存储配置。");
  }
}

function normalizeImageMime(type: string): string {
  const lower = type.toLowerCase();
  if (lower === "image/jpg") return "image/jpeg";
  return lower;
}

function shouldTryPresign(file: File, options: UploadRequestOptions): boolean {
  if (!PRESIGN_ENABLED || options.forceMultipart) return false;
  if (options.mode === "video" || file.type.startsWith("video/")) return false;
  if (!file.type.startsWith("image/")) return false;
  return true;
}

function validateImageFile(file: File) {
  const mime = normalizeImageMime(file.type);
  if (!ALLOWED_IMAGE_TYPES.includes(mime) && !ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    throw new Error("仅支持 JPG、PNG、WebP、GIF、AVIF 图片");
  }
  if (file.size > IMAGE_MAX_SIZE) {
    throw new Error("图片大小不能超过 15MB");
  }
}

function validateVideoFile(file: File) {
  if (file.size > VIDEO_MAX_SIZE) {
    throw new Error("视频大小不能超过 50MB");
  }
}

export function validateUploadFile(file: File, mode: UploadMode = "auto"): void {
  if (mode === "video") {
    validateVideoFile(file);
    return;
  }
  if (
    mode === "product" ||
    mode === "image" ||
    mode === "banner" ||
    mode === "thumb" ||
    mode === "asset"
  ) {
    validateImageFile(file);
    return;
  }
  if (file.type.startsWith("image/")) validateImageFile(file);
  if (file.type.startsWith("video/")) validateVideoFile(file);
}

function getFriendlyHttpError(status: number, rawMessage?: string): string {
  if (status === 401) return "登录已过期，请重新登录";
  if (status === 413) return "上传失败：文件过大（413），请压缩后重试";
  if (status === 503) return rawMessage || "预签名上传不可用";
  if (status === 500) return rawMessage || "服务器异常，请稍后重试";
  return rawMessage || `上传失败（HTTP ${status}）`;
}

function normalizeUploadError(error: unknown): Error {
  if (error instanceof Error) return error;
  return new Error("上传失败，请稍后重试");
}

function xhrUpload<T>(
  url: string,
  formData: FormData,
  token: string | null,
  options: UploadRequestOptions,
  csrfToken = "",
  sensitiveActionToken = "",
): Promise<{ status: number; payload: UploadEnvelope<T>; rawResponse?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.timeout = options.timeoutMs ?? 45_000;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (csrfToken) xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    if (sensitiveActionToken) xhr.setRequestHeader(ADMIN_SENSITIVE_ACTION_HEADER, sensitiveActionToken);
    xhr.setRequestHeader("Accept", "application/json");

    const onAbort = () => {
      xhr.abort();
      reject(new Error("上传已取消"));
    };
    if (options.signal) {
      if (options.signal.aborted) return onAbort();
      options.signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable || !options.onProgress) return;
      const percent = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
      options.onProgress(percent);
    };

    xhr.onerror = () => reject(new Error("网络异常，上传失败，请检查网络连接"));
    xhr.ontimeout = () => reject(new Error("上传超时，请检查网络或压缩图片后重试"));
    xhr.onabort = () => reject(new Error("上传已取消"));
    xhr.onload = () => {
      let payload: UploadEnvelope<T> = {};
      const raw = String(xhr.responseText || "");
      if (raw) {
        try {
          payload = JSON.parse(raw) as UploadEnvelope<T>;
        } catch {
          payload = {};
        }
      }
      resolve({ status: xhr.status, payload, rawResponse: raw });
    };
    xhr.send(formData);
  });
}

function xhrPutFile(
  uploadUrl: string,
  file: File,
  contentType: string,
  options: UploadRequestOptions,
): Promise<{ status: number }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.timeout = options.timeoutMs ?? 45_000;
    xhr.setRequestHeader("Content-Type", contentType);

    const onAbort = () => {
      xhr.abort();
      reject(new Error("上传已取消"));
    };
    if (options.signal) {
      if (options.signal.aborted) return onAbort();
      options.signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable || !options.onProgress) return;
      const percent = Math.max(0, Math.min(100, Math.round((evt.loaded / evt.total) * 100)));
      options.onProgress(percent);
    };

    xhr.onerror = () => reject(new Error("上传到对象存储失败，请检查网络"));
    xhr.ontimeout = () => reject(new Error("上传超时，请稍后重试"));
    xhr.onabort = () => reject(new Error("上传已取消"));
    xhr.onload = () => resolve({ status: xhr.status });
    xhr.send(file);
  });
}

function xhrJsonPost<T>(
  url: string,
  body: unknown,
  token: string | null,
  options: UploadRequestOptions,
  csrfToken = "",
  sensitiveActionToken = "",
): Promise<{ status: number; payload: UploadEnvelope<T> }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.timeout = options.timeoutMs ?? 45_000;
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.setRequestHeader("Accept", "application/json");
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    if (csrfToken) xhr.setRequestHeader("X-CSRF-Token", csrfToken);
    if (sensitiveActionToken) xhr.setRequestHeader(ADMIN_SENSITIVE_ACTION_HEADER, sensitiveActionToken);

    const onAbort = () => {
      xhr.abort();
      reject(new Error("上传已取消"));
    };
    if (options.signal) {
      if (options.signal.aborted) return onAbort();
      options.signal.addEventListener("abort", onAbort, { once: true });
    }

    xhr.onerror = () => reject(new Error("网络异常，请稍后重试"));
    xhr.ontimeout = () => reject(new Error("请求超时，请稍后重试"));
    xhr.onabort = () => reject(new Error("上传已取消"));
    xhr.onload = () => {
      let payload: UploadEnvelope<T> = {};
      const raw = String(xhr.responseText || "");
      if (raw) {
        try {
          payload = JSON.parse(raw) as UploadEnvelope<T>;
        } catch {
          payload = {};
        }
      }
      resolve({ status: xhr.status, payload });
    };
    xhr.send(JSON.stringify(body));
  });
}

async function refreshAccessToken() {
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!refreshRes.ok) throw new Error("登录已过期，请重新登录");
  const refreshBody = (await refreshRes.json()) as { data?: { accessToken?: string } };
  const token = refreshBody?.data?.accessToken;
  if (token) setAccessToken(token);
  return token || null;
}

function unwrapEnvelope<T>(result: { status: number; payload: UploadEnvelope<T> }): T {
  const payload = result.payload || {};
  if (result.status < 200 || result.status >= 300) {
    const bodyMessage = payload.message || extractMessageFromBody(payload as Record<string, unknown>);
    const message = getFriendlyHttpError(result.status, bodyMessage);
    const withTrace = payload.traceId ? `${message}（追踪ID：${payload.traceId}）` : message;
    const err = new Error(withTrace) as Error & { status?: number };
    err.status = result.status;
    throw err;
  }
  if (payload.code !== undefined && payload.code !== 0) {
    const message = payload.message || "上传失败";
    const withTrace = payload.traceId ? `${message}（追踪ID：${payload.traceId}）` : message;
    throw new Error(withTrace);
  }
  if (!payload.data) {
    throw new Error(payload.message || "服务端没有返回文件信息");
  }
  return payload.data;
}

async function authorizedJsonPost<T>(
  url: string,
  body: unknown,
  options: UploadRequestOptions,
): Promise<T> {
  const adminMode = options.adminMode ?? inAdminContext();
  let token = adminMode ? getAdminAccessToken() : getAccessToken();
  let csrfToken = adminMode ? await getAdminCsrfToken() : "";
  let result = await xhrJsonPost<T>(url, body, token, options, csrfToken);

  if (result.status === 401 && !adminMode) {
    token = await refreshAccessToken();
    result = await xhrJsonPost<T>(url, body, token, options, csrfToken);
  }

  if (result.status === 401 && adminMode) {
    try {
      await tryRefreshAdminSession();
      csrfToken = await getAdminCsrfToken();
      result = await xhrJsonPost<T>(url, body, getAdminAccessToken(), options, csrfToken);
    } catch {
      clearAdminTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
      throw new Error(extractMessageFromBody((result.payload ?? {}) as Record<string, unknown>) || "管理员登录已过期，请重新登录");
    }
  }

  if (adminMode && isAdminMfaRequiredResponse(result.status, result.payload as Record<string, unknown>)) {
    const stepUp = await requestAdminMfaStepUp(
      getAdminMfaActionClassFromResponse(result.payload as Record<string, unknown>),
    );
    csrfToken = await getAdminCsrfToken();
    result = await xhrJsonPost<T>(url, body, getAdminAccessToken(), options, csrfToken, stepUp.sensitiveActionToken);
  }

  return unwrapEnvelope(result);
}

async function doUpload<T>(url: string, formData: FormData, options: UploadRequestOptions = {}): Promise<T> {
  const adminMode = options.adminMode ?? inAdminContext();
  let token = adminMode ? getAdminAccessToken() : getAccessToken();
  let csrfToken = adminMode ? await getAdminCsrfToken() : "";
  let result = await xhrUpload<T>(url, formData, token, options, csrfToken);

  if (result.status === 401 && !adminMode) {
    token = await refreshAccessToken();
    result = await xhrUpload<T>(url, formData, token, options, csrfToken);
  }

  if (result.status === 401 && adminMode) {
    try {
      await tryRefreshAdminSession();
      csrfToken = await getAdminCsrfToken();
      result = await xhrUpload<T>(url, formData, getAdminAccessToken(), options, csrfToken);
    } catch {
      clearAdminTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
      throw new Error(extractMessageFromBody((result.payload ?? {}) as Record<string, unknown>) || "管理员登录已过期，请重新登录");
    }
    if (result.status === 401) {
      clearAdminTokens();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
        window.location.href = "/admin/login";
      }
      throw new Error(extractMessageFromBody((result.payload ?? {}) as Record<string, unknown>) || "管理员登录已过期，请重新登录");
    }
  }

  if (adminMode && isAdminMfaRequiredResponse(result.status, result.payload as Record<string, unknown>)) {
    const stepUp = await requestAdminMfaStepUp(
      getAdminMfaActionClassFromResponse(result.payload as Record<string, unknown>),
    );
    csrfToken = await getAdminCsrfToken();
    result = await xhrUpload<T>(url, formData, getAdminAccessToken(), options, csrfToken, stepUp.sensitiveActionToken);
  }

  const data = unwrapEnvelope<T>(result);
  const normalized = normalizeMediaUrls(data, BASE_URL) as T & UploadStoragePayload;
  if (typeof normalized.url === "string") ensureS3WhenNeeded(normalized);
  return normalized;
}

function uploadApiBase(adminMode: boolean) {
  return adminMode ? `${BASE_URL}/admin/upload` : `${BASE_URL}/upload`;
}

async function uploadFileViaPresign(
  file: File,
  options: UploadRequestOptions = {},
): Promise<UploadFileResult> {
  const adminMode = options.adminMode ?? inAdminContext();
  const base = uploadApiBase(adminMode);
  const mimeType = normalizeImageMime(file.type);
  const mode = options.mode && options.mode !== "auto" ? options.mode : "product";

  const ticket = await authorizedJsonPost<UploadTicket>(`${base}/ticket`, {
    mimeType,
    size: file.size,
    mode: mode === "image" ? "product" : mode,
  }, options);

  const put = await xhrPutFile(ticket.uploadUrl, file, mimeType, options);
  if (put.status < 200 || put.status >= 300) {
    throw new Error(`上传到对象存储失败（HTTP ${put.status}）`);
  }

  if (options.onProgress) options.onProgress(100);

  const completed = await authorizedJsonPost<UploadFileResult>(`${base}/complete`, {
    objectKey: ticket.objectKey,
    mimeType,
    mode: mode === "image" ? "product" : mode,
  }, { ...options, onProgress: undefined });

  const normalized = normalizeMediaUrls(completed, BASE_URL) as UploadFileResult;
  if (normalized.url) ensureS3WhenNeeded(normalized);
  return normalized;
}

export function getUploadStorageStatus(url: string, storageProvider?: string): {
  host: string;
  isS3: boolean;
  mode: "s3" | "any";
} {
  try {
    const parsed = new URL(String(url || ""), typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return { host: parsed.host, isS3: isS3StorageProvider(storageProvider) || isS3PublicUrl(parsed.href), mode: UPLOAD_STORAGE };
  } catch {
    return { host: "", isS3: isS3StorageProvider(storageProvider), mode: UPLOAD_STORAGE };
  }
}

export type UploadFileResult = {
  url: string;
  filename: string;
  storageProvider?: string;
  storageKey?: string;
  variants?: Partial<Record<"card" | "detail" | "full", string>>;
};

export async function uploadFile(
  file: File,
  options: UploadRequestOptions = {},
): Promise<UploadFileResult> {
  validateUploadFile(file, options.mode ?? "auto");

  if (shouldTryPresign(file, options)) {
    try {
      return await uploadFileViaPresign(file, options);
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      const message = error instanceof Error ? error.message : "";
      const presignUnavailable =
        status === 503
        || /预签名|对象存储未启用|STORAGE_DRIVER/i.test(message);
      if (!presignUnavailable) {
        throw normalizeUploadError(error);
      }
    }
  }

  const formData = new FormData();
  formData.append("file", file, file.name);
  if (options.mode) formData.append("mode", options.mode);
  const path = uploadApiBase(options.adminMode ?? inAdminContext());
  try {
    return await doUpload<UploadFileResult>(path, formData, options);
  } catch (error) {
    throw normalizeUploadError(error);
  }
}

export async function uploadFiles(
  files: File[],
  options: UploadRequestOptions = {},
): Promise<UploadFileResult[]> {
  const results: UploadFileResult[] = [];
  for (const file of files) {
    results.push(await uploadFile(file, options));
  }
  return results;
}

export async function uploadAdminSiteAsset(
  key: "logoUrl" | "faviconUrl",
  file: File,
  options: UploadRequestOptions = {},
): Promise<{ key: string; url: string; storageProvider?: string; storageKey?: string }> {
  validateUploadFile(file, "image");
  const formData = new FormData();
  formData.append("file", file, file.name);
  try {
    return await doUpload<{ key: string; url: string }>(`${BASE_URL}/admin/settings/assets/${key}`, formData, {
      ...options,
      adminMode: true,
      forceMultipart: true,
    });
  } catch (error) {
    throw normalizeUploadError(error);
  }
}

export function clearUploadTokensFor401() {
  clearTokens();
  clearAdminTokens();
}

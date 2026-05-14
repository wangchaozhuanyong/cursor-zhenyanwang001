import {
  clearAdminTokens,
  clearTokens,
  getAccessToken,
  getAdminAccessToken,
  setAccessToken,
} from "@/utils/token";
import { normalizeMediaUrls } from "@/utils/mediaUrl";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const IMAGE_MAX_SIZE = 15 * 1024 * 1024;
const VIDEO_MAX_SIZE = 50 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
const UPLOAD_STORAGE = ((import.meta.env.VITE_UPLOAD_STORAGE as string | undefined)?.toLowerCase() || "any") as
  | "s3"
  | "any";
const S3_HOST_ALLOWLIST =
  (import.meta.env.VITE_S3_PUBLIC_HOSTS as string | undefined)
    ?.split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean) ?? [];

export type UploadProgressCallback = (percent: number) => void;
export type UploadMode = "image" | "video" | "auto";
export type UploadRequestOptions = {
  onProgress?: UploadProgressCallback;
  timeoutMs?: number;
  adminMode?: boolean;
  signal?: AbortSignal;
  mode?: UploadMode;
};

type UploadEnvelope<T> = { code?: number; message?: string; data?: T; traceId?: string };

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

function ensureS3WhenNeeded(url: string): void {
  if (UPLOAD_STORAGE !== "s3") return;
  if (!isS3PublicUrl(url)) {
    throw new Error("上传失败：当前环境要求 S3 存储，但返回了非 S3 地址。请检查存储配置。");
  }
}

function validateImageFile(file: File) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.type.toLowerCase())) {
    throw new Error("仅支持 JPG、PNG、WebP、GIF 图片");
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
  if (mode === "image") {
    validateImageFile(file);
    return;
  }
  if (mode === "video") {
    validateVideoFile(file);
    return;
  }
  if (file.type.startsWith("image/")) validateImageFile(file);
  if (file.type.startsWith("video/")) validateVideoFile(file);
}

function getFriendlyHttpError(status: number, rawMessage?: string): string {
  if (status === 401) return "登录已过期，请重新登录";
  if (status === 413) return "上传失败：文件过大（413），请压缩后重试";
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
): Promise<{ status: number; payload: UploadEnvelope<T>; rawResponse?: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url, true);
    xhr.withCredentials = true;
    xhr.timeout = options.timeoutMs ?? 45_000;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);

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

async function doUpload<T>(url: string, formData: FormData, options: UploadRequestOptions = {}): Promise<T> {
  const adminMode = options.adminMode ?? inAdminContext();
  let token = adminMode ? getAdminAccessToken() : getAccessToken();
  let result = await xhrUpload<T>(url, formData, token, options);

  if (result.status === 401 && !adminMode) {
    token = await refreshAccessToken();
    result = await xhrUpload<T>(url, formData, token, options);
  }

  if (result.status === 401 && adminMode) {
    clearAdminTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
      window.location.href = "/admin/login";
    }
    throw new Error(extractMessageFromBody((result.payload ?? {}) as Record<string, unknown>) || "管理员登录已过期，请重新登录");
  }

  const payload = result.payload || {};
  if (result.status < 200 || result.status >= 300) {
    const bodyMessage = payload.message || extractMessageFromBody(payload as Record<string, unknown>);
    const message = getFriendlyHttpError(result.status, bodyMessage);
    const withTrace = payload.traceId ? `${message}（追踪ID：${payload.traceId}）` : message;
    throw new Error(withTrace);
  }

  if (payload.code !== undefined && payload.code !== 0) {
    const message = payload.message || "上传失败";
    const withTrace = payload.traceId ? `${message}（追踪ID：${payload.traceId}）` : message;
    throw new Error(withTrace);
  }

  if (!payload.data) {
    throw new Error(payload.message || "服务端没有返回文件信息");
  }

  const normalized = normalizeMediaUrls(payload.data, BASE_URL) as T & { url?: unknown };
  if (typeof normalized.url === "string") {
    ensureS3WhenNeeded(normalized.url);
  }
  return normalized;
}

export function getUploadStorageStatus(url: string): {
  host: string;
  isS3: boolean;
  mode: "s3" | "any";
} {
  try {
    const parsed = new URL(String(url || ""), typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return { host: parsed.host, isS3: isS3PublicUrl(parsed.href), mode: UPLOAD_STORAGE };
  } catch {
    return { host: "", isS3: false, mode: UPLOAD_STORAGE };
  }
}

export async function uploadFile(
  file: File,
  options: UploadRequestOptions = {},
): Promise<{ url: string; filename: string }> {
  validateUploadFile(file, options.mode ?? "auto");
  const formData = new FormData();
  formData.append("file", file, file.name);
  const path = (options.adminMode ?? inAdminContext()) ? `${BASE_URL}/admin/upload` : `${BASE_URL}/upload`;
  try {
    return await doUpload<{ url: string; filename: string }>(path, formData, options);
  } catch (error) {
    throw normalizeUploadError(error);
  }
}

export async function uploadFiles(
  files: File[],
  options: UploadRequestOptions = {},
): Promise<{ url: string; filename: string }[]> {
  const formData = new FormData();
  for (const file of files) {
    validateUploadFile(file, options.mode ?? "auto");
    formData.append("files", file, file.name);
  }
  const path = (options.adminMode ?? inAdminContext()) ? `${BASE_URL}/admin/upload/multiple` : `${BASE_URL}/upload/multiple`;
  try {
    return await doUpload<{ url: string; filename: string }[]>(path, formData, options);
  } catch (error) {
    throw normalizeUploadError(error);
  }
}

export async function uploadAdminSiteAsset(
  key: "logoUrl" | "faviconUrl",
  file: File,
  options: UploadRequestOptions = {},
): Promise<{ key: string; url: string }> {
  validateUploadFile(file, "image");
  const formData = new FormData();
  formData.append("file", file, file.name);
  try {
    return await doUpload<{ key: string; url: string }>(`${BASE_URL}/admin/settings/assets/${key}`, formData, {
      ...options,
      adminMode: true,
    });
  } catch (error) {
    throw normalizeUploadError(error);
  }
}

export function clearUploadTokensFor401() {
  clearTokens();
  clearAdminTokens();
}

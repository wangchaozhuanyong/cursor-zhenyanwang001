import {
  getAccessToken,
  setAccessToken,
  clearTokens,
  getAdminAccessToken,
  clearAdminTokens,
} from "@/utils/token";
import { normalizeMediaUrls } from "@/utils/mediaUrl";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";
const IMAGE_MAX_SIZE = 15 * 1024 * 1024;

const UPLOAD_STORAGE = (import.meta.env.VITE_UPLOAD_STORAGE as string | undefined)?.toLowerCase() ?? "s3";
const S3_HOST_ALLOWLIST =
  (import.meta.env.VITE_S3_PUBLIC_HOSTS as string | undefined)
    ?.split(",")
    .map((s: string) => s.trim().toLowerCase())
    .filter(Boolean) ?? [];

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

export function getUploadStorageStatus(url: string): {
  host: string;
  isS3: boolean;
  mode: "s3" | "any";
} {
  try {
    const parsed = new URL(String(url || ""), typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return {
      host: parsed.host,
      isS3: isS3PublicUrl(parsed.href),
      mode: UPLOAD_STORAGE === "any" ? "any" : "s3",
    };
  } catch {
    return {
      host: "",
      isS3: false,
      mode: UPLOAD_STORAGE === "any" ? "any" : "s3",
    };
  }
}

function enforceUploadStorage(url: string): void {
  if (UPLOAD_STORAGE === "any") return;
  if (UPLOAD_STORAGE === "s3" && !isS3PublicUrl(url)) {
    throw new Error("上传失败：图片未存储到 Amazon S3（或 CloudFront）");
  }
}

async function refreshAndRetry(url: string, formData: FormData): Promise<Response> {
  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
  });
  if (!refreshRes.ok) {
    clearTokens();
    throw new Error("登录已过期，请重新登录");
  }

  const refreshBody = await refreshRes.json();
  const newToken = refreshBody?.data?.accessToken;
  if (newToken) setAccessToken(newToken);

  return fetch(url, {
    method: "POST",
    headers: newToken ? { Authorization: `Bearer ${newToken}` } : {},
    body: formData,
    credentials: "include",
  });
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

async function doUpload<T>(url: string, formData: FormData): Promise<T> {
  const adminMode = inAdminContext();
  const token = adminMode ? getAdminAccessToken() : getAccessToken();
  let response = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    credentials: "include",
  });

  if (response.status === 401 && !adminMode) {
    response = await refreshAndRetry(url, formData);
  }

  if (response.status === 401 && adminMode) {
    let message = "登录已过期，请重新登录";
    try {
      const body = (await response.json()) as Record<string, unknown>;
      message = extractMessageFromBody(body) || message;
    } catch {
      // keep fallback message
    }
    clearAdminTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
      window.location.href = "/admin/login";
    }
    throw new Error(message);
  }

  if (!response.ok) {
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const gateway413Message = "上传被拒绝（413），请检查服务端上传大小限制。";

    if (response.status === 413 && !contentType.includes("application/json")) {
      throw new Error(gateway413Message);
    }

    let message = response.status === 413 ? gateway413Message : `上传失败（HTTP ${response.status}）`;
    try {
      if (contentType.includes("application/json")) {
        const body = (await response.json()) as Record<string, unknown>;
        message = extractMessageFromBody(body) || message;
        const traceId = body.traceId;
        if (typeof traceId === "string" && traceId) {
          message = `${message}（追踪ID：${traceId}）`;
        }
      } else {
        const text = (await response.text()).trim().replace(/\s+/g, " ");
        if (text) message = `${message}：${text.slice(0, 240)}`;
      }
    } catch {
      // keep fallback message
    }
    throw new Error(message);
  }

  let payload: { data?: T; code?: number; message?: string; traceId?: string };
  try {
    payload = (await response.json()) as { data?: T; code?: number; message?: string; traceId?: string };
  } catch {
    throw new Error("上传成功，但服务端响应无法解析");
  }

  if (payload.code !== 0 && payload.code !== undefined) {
    const message = payload.message || "上传失败";
    const trace =
      typeof payload.traceId === "string" && payload.traceId ? `（追踪ID：${payload.traceId}）` : "";
    throw new Error(`${message}${trace}`);
  }
  if (payload.data === undefined || payload.data === null) {
    throw new Error(payload.message || "服务端未返回文件信息");
  }

  const normalized = normalizeMediaUrls(payload.data, BASE_URL);
  const maybeUrl = (normalized as { url?: unknown })?.url;
  if (typeof maybeUrl === "string") enforceUploadStorage(maybeUrl);
  return normalized;
}

export async function uploadFile(file: File): Promise<{ url: string; filename: string }> {
  if (file.type.startsWith("image/") && file.size > IMAGE_MAX_SIZE) {
    throw new Error("图片大小不能超过 15MB，请压缩后再上传");
  }
  const formData = new FormData();
  formData.append("file", file);
  const path = inAdminContext() ? `${BASE_URL}/admin/upload` : `${BASE_URL}/upload`;
  return doUpload<{ url: string; filename: string }>(path, formData);
}

export async function uploadFiles(files: File[]): Promise<{ url: string; filename: string }[]> {
  const formData = new FormData();
  for (const file of files) {
    if (file.type.startsWith("image/") && file.size > IMAGE_MAX_SIZE) {
      throw new Error("图片大小不能超过 15MB，请压缩后再上传");
    }
    formData.append("files", file);
  }
  const path = inAdminContext() ? `${BASE_URL}/admin/upload/multiple` : `${BASE_URL}/upload/multiple`;
  return doUpload<{ url: string; filename: string }[]>(path, formData);
}

export async function uploadAdminSiteAsset(
  key: "logoUrl" | "faviconUrl",
  file: File,
): Promise<{ key: string; url: string }> {
  if (file.type.startsWith("image/") && file.size > IMAGE_MAX_SIZE) {
    throw new Error("图片大小不能超过 15MB，请压缩后再上传");
  }
  const formData = new FormData();
  formData.append("file", file);
  return doUpload<{ key: string; url: string }>(`${BASE_URL}/admin/settings/assets/${key}`, formData);
}

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
  const newToken = refreshBody.data?.accessToken;
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
      // keep default message
    }
    clearAdminTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
      window.location.href = "/admin/login";
    }
    throw new Error(message);
  }

  if (!response.ok) {
    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    const gateway413Message =
      "上传被网关拒绝（413）：请检查 Nginx 的 client_max_body_size 配置是否足够。";

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
    throw new Error("上传成功但服务器响应无法解析，请稍后重试");
  }

  if (payload.code !== 0 && payload.code !== undefined) {
    const message = payload.message || "上传失败";
    const trace = typeof payload.traceId === "string" && payload.traceId ? `（追踪ID：${payload.traceId}）` : "";
    throw new Error(`${message}${trace}`);
  }
  if (payload.data === undefined || payload.data === null) {
    throw new Error(payload.message || "未返回文件信息");
  }
  return normalizeMediaUrls(payload.data, BASE_URL);
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
  const formData = new FormData();
  formData.append("file", file);
  return doUpload<{ key: string; url: string }>(`${BASE_URL}/admin/settings/assets/${key}`, formData);
}

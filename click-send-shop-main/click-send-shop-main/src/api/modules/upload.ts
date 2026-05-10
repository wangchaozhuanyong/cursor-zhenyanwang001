import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  clearTokens,
  getAdminAccessToken,
  clearAdminTokens,
} from "@/utils/token";
import { normalizeMediaUrls } from "@/utils/mediaUrl";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "/api";

async function refreshAndRetry(url: string, formData: FormData): Promise<Response> {
  const rt = getRefreshToken();
  if (!rt) { clearTokens(); throw new Error("登录已过期，请重新登录"); }

  const refreshRes = await fetch(`${BASE_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: rt }),
  });
  if (!refreshRes.ok) { clearTokens(); throw new Error("登录已过期，请重新登录"); }

  const refreshBody = await refreshRes.json();
  const newToken = refreshBody.data?.accessToken;
  if (newToken) setAccessToken(newToken);

  return fetch(url, {
    method: "POST",
    headers: newToken ? { Authorization: `Bearer ${newToken}` } : {},
    body: formData,
  });
}

function inAdminContext() {
  return typeof window !== "undefined" && window.location.pathname.startsWith("/admin");
}

function extractMessageFromBody(body: Record<string, unknown>): string | undefined {
  const candidates = [body.message, body.error, body.msg];
  for (const v of candidates) {
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return undefined;
}

async function doUpload<T>(url: string, formData: FormData): Promise<T> {
  const adminMode = inAdminContext();
  const token = adminMode ? getAdminAccessToken() : getAccessToken();
  let res = await fetch(url, {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
  });

  if (res.status === 401 && !adminMode) {
    res = await refreshAndRetry(url, formData);
  }

  if (res.status === 401 && adminMode) {
    let msg = "登录已过期，请重新登录";
    try {
      const body = (await res.json()) as Record<string, unknown>;
      msg = extractMessageFromBody(body) || msg;
    } catch { /* keep default */ }
    clearAdminTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
      window.location.href = "/admin/login";
    }
    throw new Error(msg);
  }

  if (!res.ok) {
    let message = `上传失败（HTTP ${res.status}）`;
    if (res.status === 413) {
      message = "文件过大被网关拒绝（413）。视频最大 50MB；若已部署 Nginx，请在 server 中设置 client_max_body_size（建议 60m）后重载 Nginx";
    }
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    try {
      if (ct.includes("application/json")) {
        const body = (await res.json()) as Record<string, unknown>;
        message = extractMessageFromBody(body) || message;
        const traceId = body.traceId;
        if (typeof traceId === "string" && traceId) {
          message = `${message}（追踪ID：${traceId}）`;
        }
      } else {
        const text = (await res.text()).trim().replace(/\s+/g, " ");
        if (text) message = `${message}：${text.slice(0, 240)}`;
      }
    } catch {
      /* keep message */
    }
    throw new Error(message);
  }

  let payload: { data?: T; code?: number; message?: string; traceId?: string };
  try {
    payload = (await res.json()) as { data?: T; code?: number; message?: string; traceId?: string };
  } catch {
    throw new Error("上传成功但服务器返回无法解析，请稍后重试");
  }
  if (payload.code !== 0 && payload.code !== undefined) {
    const hint = payload.message || "上传失败";
    const tid = typeof payload.traceId === "string" && payload.traceId ? `（追踪ID：${payload.traceId}）` : "";
    throw new Error(`${hint}${tid}`);
  }
  if (payload.data === undefined || payload.data === null) {
    const hint = payload.message || "未返回文件信息";
    throw new Error(hint);
  }
  return normalizeMediaUrls(payload.data, BASE_URL);
}

export async function uploadFile(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const path = inAdminContext() ? `${BASE_URL}/admin/upload` : `${BASE_URL}/upload`;
  return doUpload<{ url: string; filename: string }>(path, formData);
}

export async function uploadFiles(files: File[]): Promise<{ url: string; filename: string }[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
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

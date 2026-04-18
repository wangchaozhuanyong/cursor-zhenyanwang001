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
    clearAdminTokens();
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
      window.location.href = "/admin/login";
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error((body as { message?: string }).message || "上传失败");
  }

  const body = (await res.json()) as { data: T };
  return normalizeMediaUrls(body.data, BASE_URL);
}

export async function uploadFile(file: File): Promise<{ url: string; filename: string }> {
  const formData = new FormData();
  formData.append("file", file);
  return doUpload<{ url: string; filename: string }>(`${BASE_URL}/upload`, formData);
}

export async function uploadFiles(files: File[]): Promise<{ url: string; filename: string }[]> {
  const formData = new FormData();
  files.forEach((f) => formData.append("files", f));
  return doUpload<{ url: string; filename: string }[]>(`${BASE_URL}/upload/multiple`, formData);
}

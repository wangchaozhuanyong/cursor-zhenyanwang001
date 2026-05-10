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
const IMAGE_MAX_SIZE = 15 * 1024 * 1024;
const CLIENT_IMAGE_TARGET_MAX_EDGE = 1600;
const CLIENT_IMAGE_WEBP_QUALITY = 0.82;
const CLIENT_IMAGE_OPTIMIZE_MIN_SIZE = 512 * 1024;

function isOptimizableImage(file: File) {
  return file.type.startsWith("image/") && file.type !== "image/gif" && file.type !== "image/svg+xml";
}

function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("图片读取失败，请换一张图片重试"));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeImageBeforeUpload(file: File): Promise<File> {
  if (!isOptimizableImage(file)) return file;
  if (typeof window === "undefined" || typeof document === "undefined") return file;

  const image = await blobToImage(file);
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;
  if (!sourceWidth || !sourceHeight) return file;

  const scale = Math.min(1, CLIENT_IMAGE_TARGET_MAX_EDGE / sourceWidth, CLIENT_IMAGE_TARGET_MAX_EDGE / sourceHeight);
  if (scale === 1 && file.size < CLIENT_IMAGE_OPTIMIZE_MIN_SIZE) return file;

  const width = Math.max(1, Math.round(sourceWidth * scale));
  const height = Math.max(1, Math.round(sourceHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(image, 0, 0, width, height);
  const webpBlob = await canvasToBlob(canvas, "image/webp", CLIENT_IMAGE_WEBP_QUALITY);
  if (!webpBlob) return file;

  // If browser-side conversion does not reduce bytes and did not resize, avoid changing the file needlessly.
  if (scale === 1 && webpBlob.size >= file.size * 0.95) return file;

  const optimizedName = file.name.replace(/\.[^.]+$/, "") || "upload";
  return new File([webpBlob], `${optimizedName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

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
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const gateway413 =
      "上传被网关拒绝（413）：反向代理（多为 Nginx）默认只允许约 1MB 请求体。请在 http{} 或 server{} 内设置 client_max_body_size 60m;，或将仓库内 deploy/nginx/conf.d-upload-body-global.conf 安装为 /etc/nginx/conf.d/90-upload-body-size.conf，然后 sudo nginx -t && sudo systemctl reload nginx。后端单图上限 15MB、视频 50MB。";

    // 网关 413 常返回 HTML，不要把整页源码拼进提示里
    if (res.status === 413 && !ct.includes("application/json")) {
      throw new Error(gateway413);
    }

    let message = res.status === 413 ? gateway413 : `上传失败（HTTP ${res.status}）`;
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
  const uploadFile = await optimizeImageBeforeUpload(file);
  if (uploadFile.type.startsWith("image/") && uploadFile.size > IMAGE_MAX_SIZE) {
    throw new Error("图片大小不能超过 15MB，请压缩后再上传");
  }
  const formData = new FormData();
  formData.append("file", uploadFile);
  const path = inAdminContext() ? `${BASE_URL}/admin/upload` : `${BASE_URL}/upload`;
  return doUpload<{ url: string; filename: string }>(path, formData);
}

export async function uploadFiles(files: File[]): Promise<{ url: string; filename: string }[]> {
  const formData = new FormData();
  for (const rawFile of files) {
    const file = await optimizeImageBeforeUpload(rawFile);
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
  const uploadFile = await optimizeImageBeforeUpload(file);
  const formData = new FormData();
  formData.append("file", uploadFile);
  return doUpload<{ key: string; url: string }>(`${BASE_URL}/admin/settings/assets/${key}`, formData);
}

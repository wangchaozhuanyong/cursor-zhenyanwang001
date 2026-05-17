const UPLOADS_PREFIX = "/uploads/";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";

function getApiOrigin(baseUrl: string): string {
  try {
    const fallback =
      typeof window !== "undefined" ? window.location.origin : "http://localhost";
    return new URL(baseUrl, fallback).origin;
  } catch {
    return "";
  }
}

function normalizeString(value: string, apiOrigin: string): string {
  if (!value.startsWith(UPLOADS_PREFIX)) return value;
  return apiOrigin ? `${apiOrigin}${value}` : value;
}

export function normalizeMediaUrls<T>(input: T, baseUrl: string): T {
  const apiOrigin = getApiOrigin(baseUrl);

  const walk = (node: unknown): unknown => {
    if (typeof node === "string") return normalizeString(node, apiOrigin);
    if (Array.isArray(node)) return node.map((item) => walk(item));
    if (node && typeof node === "object") {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(node)) out[k] = walk(v);
      return out;
    }
    return node;
  };

  return walk(input) as T;
}

/** 将 /uploads/... 转为可访问的绝对地址（本地持久化购物车等未经 API 归一化时也需要） */
export function ensureMediaUrl(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^(https?:|data:|blob:)/i.test(raw)) return raw;
  if (!raw.startsWith(UPLOADS_PREFIX)) return raw;
  const apiOrigin = getApiOrigin(API_BASE);
  return apiOrigin ? `${apiOrigin}${raw}` : raw;
}

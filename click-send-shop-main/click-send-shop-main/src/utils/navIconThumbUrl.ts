const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "/api";
const UPLOADS_PATH = "/uploads/";

function joinApiPath(path: string): string {
  const base = String(API_BASE || "/api").replace(/\/+$/, "");
  return `${base}${path}`;
}

export function shouldUseNavIconThumbProxy(value: string | null | undefined): boolean {
  const raw = String(value || "").trim();
  if (!raw || raw.startsWith("data:") || raw.startsWith("blob:")) return false;
  if (raw.startsWith("/api/media/nav-icon-thumb")) return false;
  if (raw.startsWith(UPLOADS_PATH)) return true;

  try {
    const url = new URL(raw, typeof window !== "undefined" ? window.location.origin : "http://localhost");
    return /^https?:$/i.test(url.protocol) && url.pathname.includes(UPLOADS_PATH);
  } catch {
    return false;
  }
}

export function resolveNavIconThumbUrl(value: string | null | undefined): string {
  const raw = String(value || "").trim();
  if (!shouldUseNavIconThumbProxy(raw)) return raw;
  return joinApiPath(`/media/nav-icon-thumb?src=${encodeURIComponent(raw)}`);
}

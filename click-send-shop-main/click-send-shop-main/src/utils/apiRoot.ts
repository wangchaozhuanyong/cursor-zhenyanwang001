/**
 * 浏览器内可用的 API 根路径（含 origin），用于 OAuth 跳转等非 fetch 场景。
 */
export function getPublicApiRoot(): string {
  const b = (import.meta.env.VITE_API_BASE_URL ?? "/api").replace(/\/$/, "");
  if (b.startsWith("http")) return b;
  if (typeof window === "undefined") return b;
  return `${window.location.origin}${b.startsWith("/") ? b : `/${b}`}`;
}

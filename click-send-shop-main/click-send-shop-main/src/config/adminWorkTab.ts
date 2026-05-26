/** 工作标签：路径规范化与是否纳入标签栏 */

const LOGIN_PREFIX = "/admin/login";

export function normalizeAdminTabPath(pathname: string, search = ""): string {
  const base = pathname.replace(/\/+$/, "") || "/admin";
  const q = search && search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${base}${q}`;
}

export function adminTabPathKey(fullPath: string): string {
  const [pathname, search = ""] = fullPath.split("?");
  const base = pathname.replace(/\/+$/, "") || "/admin";
  return search ? `${base}?${search}` : base;
}

export function shouldTrackAdminWorkTab(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  if (pathname === LOGIN_PREFIX || pathname.startsWith(`${LOGIN_PREFIX}/`)) return false;
  return true;
}

export const ADMIN_WORK_TABS_MAX = 15;
export const ADMIN_WORK_TABS_STORAGE_KEY = "admin.workTabs.v1";

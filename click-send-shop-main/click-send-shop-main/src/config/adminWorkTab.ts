/** 工作标签：路径规范化与是否纳入标签栏 */

const LOGIN_PREFIX = "/admin/login";

export function normalizeAdminTabPath(pathname: string, search = ""): string {
  const base = pathname.replace(/\/+$/, "") || "/admin";
  const q = search && search.startsWith("?") ? search : search ? `?${search}` : "";
  return `${base}${q}`;
}

function activityCreateTabQueryKey(search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const scoped = new URLSearchParams();
  const type = params.get("type");
  const copyFrom = params.get("copy_from");
  if (type) scoped.set("type", type);
  if (copyFrom) scoped.set("copy_from", copyFrom);
  const key = scoped.toString();
  return key ? `?${key}` : "";
}

export function adminTabPathKey(fullPath: string): string {
  const [pathname, rawSearch = ""] = fullPath.split("?");
  const base = pathname.replace(/\/+$/, "") || "/admin";
  if (base === "/admin/marketing/activities/new") {
    return `${base}${activityCreateTabQueryKey(rawSearch)}`;
  }
  return base;
}

export function shouldTrackAdminWorkTab(pathname: string): boolean {
  if (!pathname.startsWith("/admin")) return false;
  if (pathname === LOGIN_PREFIX || pathname.startsWith(`${LOGIN_PREFIX}/`)) return false;
  return true;
}

export const ADMIN_WORK_TABS_MAX = 15;
export const ADMIN_WORK_TABS_STORAGE_KEY = "admin.workTabs.v3";

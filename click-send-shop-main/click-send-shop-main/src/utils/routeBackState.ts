const ROUTE_BACK_PREFIX = "route-back:";
const ROUTE_BACK_KEYS = "route-back:keys";
const ROUTE_BACK_MAX = 80;

export type RouteLocationLike = {
  pathname: string;
  search?: string;
  hash?: string;
};

export function buildRoutePath(location: RouteLocationLike): string {
  return `${location.pathname || "/"}${location.search || ""}${location.hash || ""}`;
}

function basePathOf(path: string): string {
  return path.split(/[?#]/)[0] || "/";
}

function isChildToParentNavigation(previousPath: string, currentPath: string): boolean {
  const previousBase = basePathOf(previousPath);
  const currentBase = basePathOf(currentPath);
  return currentBase !== "/" && previousBase.startsWith(`${currentBase}/`);
}

export function normalizeInternalRoutePath(value?: string): string | undefined {
  const raw = (value || "").trim();
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return undefined;

  try {
    const url = new URL(raw, window.location.origin);
    if (url.origin !== window.location.origin) return undefined;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const [pathWithSearch, hash = ""] = raw.split("#", 2);
    const [pathname, search = ""] = (pathWithSearch || "").split("?", 2);
    if (!pathname.startsWith("/") || pathname.startsWith("//")) return undefined;
    return `${pathname}${search ? `?${search}` : ""}${hash ? `#${hash}` : ""}`;
  }
}

export function isAuthRoute(path: string): boolean {
  const base = basePathOf(path);
  return base === "/login" || base === "/register" || base.startsWith("/login/") || base === "/admin/login";
}

export function isUsableBackRoute(path: string | undefined, currentPath: string): path is string {
  const normalized = normalizeInternalRoutePath(path);
  if (!normalized) return false;
  if (isAuthRoute(normalized)) return false;
  return normalized !== normalizeInternalRoutePath(currentPath);
}

function storageAvailable(): boolean {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function routeBackKey(locationKey: string): string {
  return `${ROUTE_BACK_PREFIX}${locationKey}`;
}

function rememberStorageKey(key: string) {
  if (!storageAvailable()) return;
  try {
    const raw = window.sessionStorage.getItem(ROUTE_BACK_KEYS);
    const keys = raw ? JSON.parse(raw) : [];
    const next = [key, ...(Array.isArray(keys) ? keys.filter((item) => item !== key) : [])].slice(0, ROUTE_BACK_MAX);
    window.sessionStorage.setItem(ROUTE_BACK_KEYS, JSON.stringify(next));
  } catch {
    // Storage is best-effort only.
  }
}

export function rememberRouteBack(locationKey: string, fromPath: string, currentPath: string) {
  if (!storageAvailable()) return;
  if (!locationKey || locationKey === "default") return;

  const normalizedFrom = normalizeInternalRoutePath(fromPath);
  if (!isUsableBackRoute(normalizedFrom, currentPath)) return;

  const key = routeBackKey(locationKey);
  try {
    window.sessionStorage.setItem(key, normalizedFrom);
    rememberStorageKey(key);
  } catch {
    // Storage is best-effort only.
  }
}

export function readRouteBack(locationKey: string, currentPath: string): string | undefined {
  if (!storageAvailable()) return undefined;
  if (!locationKey || locationKey === "default") return undefined;

  try {
    const stored = window.sessionStorage.getItem(routeBackKey(locationKey)) || undefined;
    const normalized = normalizeInternalRoutePath(stored);
    return isUsableBackRoute(normalized, currentPath) ? normalized : undefined;
  } catch {
    return undefined;
  }
}

export function resolveTrackedRouteBackSource(input: {
  previousPath: string;
  currentPath: string;
  previousStoredFrom?: string;
}): string | undefined {
  if (input.previousPath === input.currentPath) return undefined;

  if (isChildToParentNavigation(input.previousPath, input.currentPath)) {
    const storedFrom = normalizeInternalRoutePath(input.previousStoredFrom);
    const currentBase = basePathOf(input.currentPath);
    const storedBase = storedFrom ? basePathOf(storedFrom) : "";
    if (!storedFrom || storedBase === currentBase || storedBase.startsWith(`${currentBase}/`)) {
      return undefined;
    }
    return storedFrom;
  }

  if (basePathOf(input.previousPath) === basePathOf(input.currentPath)) {
    return normalizeInternalRoutePath(input.previousStoredFrom);
  }

  return normalizeInternalRoutePath(input.previousPath);
}

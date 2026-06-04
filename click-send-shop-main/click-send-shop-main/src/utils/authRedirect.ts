import { isAuthRoute, isUsableBackRoute, normalizeInternalRoutePath } from "@/utils/routeBackState";

const AUTH_REQUIRED_EXACT_PATHS = new Set([
  "/checkout",
  "/settings",
  "/member/benefits",
  "/orders",
  "/invite",
  "/points",
  "/points/gifts",
  "/rewards",
  "/address",
  "/notifications",
  "/returns",
  "/reviews/pending",
]);

function pathnameOf(path: string): string {
  const withoutHash = path.split("#", 1)[0] || "/";
  return withoutHash.split("?", 1)[0] || "/";
}

export function isStoreAuthRequiredRoute(path: string | undefined): boolean {
  const normalized = normalizeInternalRoutePath(path);
  if (!normalized) return false;

  const pathname = pathnameOf(normalized);
  return (
    AUTH_REQUIRED_EXACT_PATHS.has(pathname)
    || pathname.startsWith("/orders/")
    || pathname.startsWith("/returns/")
  );
}

export function resolveAuthRedirectTarget(rawFrom: string | undefined, fallback = "/"): string {
  const normalized = normalizeInternalRoutePath(rawFrom);
  if (!normalized || isAuthRoute(normalized) || normalized.startsWith("/admin")) {
    return normalizeInternalRoutePath(fallback) || "/";
  }
  return normalized;
}

function isLoginCancelRoute(path: string | undefined, currentPath: string): path is string {
  const normalized = normalizeInternalRoutePath(path);
  if (!isUsableBackRoute(normalized, currentPath)) return false;
  if (normalized.startsWith("/admin")) return false;
  if (isStoreAuthRequiredRoute(normalized)) return false;
  return true;
}

export function resolveLoginCancelTarget(input: {
  currentPath: string;
  cancelFrom?: string;
  returnTo?: string;
  trackedFrom?: string;
  fallback?: string;
}): string {
  const candidates = [input.cancelFrom, input.returnTo, input.trackedFrom];
  for (const candidate of candidates) {
    const normalized = normalizeInternalRoutePath(candidate);
    if (isLoginCancelRoute(normalized, input.currentPath)) return normalized;
  }

  const fallback = normalizeInternalRoutePath(input.fallback) || "/";
  return isLoginCancelRoute(fallback, input.currentPath) ? fallback : "/";
}

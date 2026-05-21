/** Routes that render {@link BottomNav} via FrontLayout. */
export const STORE_TAB_PATHS = new Set([
  "/",
  "/categories",
  "/new-arrivals",
  "/search",
  "/cart",
  "/favorites",
  "/profile",
  "/support-download",
]);

export function isStoreTabPath(pathname: string): boolean {
  return STORE_TAB_PATHS.has(pathname);
}

/**
 * `bottom` offset for fixed overlays (e.g. cookie banner) so they sit above
 * bottom tab bar / checkout action bars instead of covering them.
 */
export function getStoreFixedBottomOffset(pathname: string): string {
  const safe = "env(safe-area-inset-bottom, 0px)";
  const nav = "var(--store-bottom-nav-height, 72px)";
  const action = "var(--store-action-bar-height, 4.75rem)";

  if (pathname.startsWith("/checkout") || pathname.startsWith("/product/")) {
    return `calc(${action} + ${safe})`;
  }
  if (pathname === "/cart") {
    return `calc(${nav} + ${action} + ${safe})`;
  }
  if (STORE_TAB_PATHS.has(pathname)) {
    return `calc(${nav} + ${safe})`;
  }
  return safe;
}

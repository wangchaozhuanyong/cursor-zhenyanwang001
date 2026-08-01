import { stripPublicLocaleFromPathname } from "@/i18n/publicLocale";

/** 搜索、结算、详情和独立服务流程使用沉浸式页面，不展示底部导航。 */
export function shouldHideBottomNav(pathname: string): boolean {
  const canonicalPathname = stripPublicLocaleFromPathname(pathname);
  return (
    canonicalPathname === "/search" ||
    canonicalPathname === "/support-download" ||
    canonicalPathname.startsWith("/checkout") ||
    canonicalPathname.startsWith("/orders/") ||
    canonicalPathname.startsWith("/product/") ||
    canonicalPathname.startsWith("/promotions/")
  );
}

export function shouldSkipIdleTabRoutePreload(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const minScreen = Math.min(window.screen?.width || window.innerWidth, window.screen?.height || window.innerHeight);
  const minViewport = Math.min(window.innerWidth || minScreen, window.innerHeight || minScreen);
  const compactEdge = Math.min(minScreen || minViewport, minViewport || minScreen);
  return navigator.maxTouchPoints > 0 && compactEdge > 0 && compactEdge <= 768;
}

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

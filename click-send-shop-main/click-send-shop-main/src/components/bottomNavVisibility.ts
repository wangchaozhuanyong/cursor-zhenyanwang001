import { stripPublicLocaleFromPathname } from "@/i18n/publicLocale";

/** 搜索、结算和详情类任务页使用沉浸式页面，不展示底部导航。 */
export function shouldHideBottomNav(pathname: string): boolean {
  const canonicalPathname = stripPublicLocaleFromPathname(pathname);
  return (
    canonicalPathname === "/search" ||
    canonicalPathname.startsWith("/checkout") ||
    canonicalPathname.startsWith("/product/") ||
    canonicalPathname.startsWith("/promotions/")
  );
}

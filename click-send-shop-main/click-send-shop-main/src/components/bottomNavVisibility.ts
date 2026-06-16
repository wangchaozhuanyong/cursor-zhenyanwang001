import { stripPublicLocaleFromPathname } from "@/i18n/publicLocale";

/** 结算页不展示底部导航，避免与结算操作区重叠 */
export function shouldHideBottomNav(pathname: string): boolean {
  const canonicalPathname = stripPublicLocaleFromPathname(pathname);
  return canonicalPathname.startsWith("/checkout") || canonicalPathname.startsWith("/product/");
}

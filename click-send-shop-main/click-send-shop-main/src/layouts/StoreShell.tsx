import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import StoreDesktopHeader from "@/components/store/StoreDesktopHeader";
import StoreTabletBar from "@/components/store/StoreTabletBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isStoreTabPath } from "@/utils/storeBottomInset";
import { stripPublicLocaleFromPathname } from "@/i18n/publicLocale";

type StoreShellProps = {
  children: ReactNode;
};

/** 前台宽屏壳层：仅 tablet / desktop 追加顶栏，不改变 <768px 布局 */
export default function StoreShell({ children }: StoreShellProps) {
  const { pathname } = useLocation();
  const canonicalPathname = stripPublicLocaleFromPathname(pathname);
  const isTab = isStoreTabPath(pathname);
  const hideChrome = canonicalPathname.startsWith("/checkout");
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1279px)");
  const fixedHeaderClassName = "store-fixed-header";

  return (
    <div className="store-shell relative min-h-[100dvh]">
      {!hideChrome && isDesktop ? (
        <StoreDesktopHeader className={fixedHeaderClassName} />
      ) : null}
      {!hideChrome && isTab && isTablet ? (
        <StoreTabletBar className={fixedHeaderClassName} />
      ) : null}
      <div>{children}</div>
    </div>
  );
}

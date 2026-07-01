import { lazy, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isStoreTabPath } from "@/utils/storeBottomInset";
import { stripPublicLocaleFromPathname } from "@/i18n/publicLocale";

type StoreShellProps = {
  children: ReactNode;
};

const StoreDesktopHeader = lazy(() => import("@/components/store/StoreDesktopHeader"));
const StoreTabletBar = lazy(() => import("@/components/store/StoreTabletBar"));

/** 前台宽屏壳层：仅 tablet / desktop 追加顶栏，不改变 <768px 布局 */
export default function StoreShell({ children }: StoreShellProps) {
  const { pathname } = useLocation();
  const canonicalPathname = stripPublicLocaleFromPathname(pathname);
  const isTab = isStoreTabPath(pathname);
  const hideChrome = canonicalPathname.startsWith("/checkout");
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1279px)");
  const fixedHeaderClassName = "sf-next-fixed-header";

  return (
    <div className="sf-next-store-shell relative min-h-[100dvh] min-w-0 overflow-x-clip">
      {!hideChrome && isDesktop ? (
        <Suspense fallback={null}>
          <StoreDesktopHeader className={fixedHeaderClassName} />
        </Suspense>
      ) : null}
      {!hideChrome && isTab && isTablet ? (
        <Suspense fallback={null}>
          <StoreTabletBar className={fixedHeaderClassName} />
        </Suspense>
      ) : null}
      <div className="sf-next-store-shell__body min-w-0">{children}</div>
    </div>
  );
}

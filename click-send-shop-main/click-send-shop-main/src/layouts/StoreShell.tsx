import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import StoreDesktopHeader from "@/components/store/StoreDesktopHeader";
import StoreTabletBar from "@/components/store/StoreTabletBar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isStoreTabPath } from "@/utils/storeBottomInset";

type StoreShellProps = {
  children: ReactNode;
};

/** 前台宽屏壳层：仅 md/lg 追加顶栏与上内边距，不改变 &lt;768px 布局 */
export default function StoreShell({ children }: StoreShellProps) {
  const { pathname } = useLocation();
  const isTab = isStoreTabPath(pathname);
  const hideChrome = pathname.startsWith("/checkout");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");
  const homeHeaderClassName = pathname === "/" ? "store-home-fixed-header" : undefined;

  return (
    <div className="store-shell relative min-h-[100dvh]">
      {!hideChrome && isDesktop ? (
        <StoreDesktopHeader className={homeHeaderClassName} />
      ) : null}
      {!hideChrome && isTab && isTablet ? (
        <StoreTabletBar className={homeHeaderClassName} />
      ) : null}
      <div>{children}</div>
    </div>
  );
}

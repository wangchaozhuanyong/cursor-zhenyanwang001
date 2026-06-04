import { lazy, Suspense, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { isStoreTabPath } from "@/utils/storeBottomInset";

type StoreShellProps = {
  children: ReactNode;
};

const StoreDesktopHeader = lazy(() => import("@/components/store/StoreDesktopHeader"));
const StoreTabletBar = lazy(() => import("@/components/store/StoreTabletBar"));

function StoreHeaderFallback({ variant }: { variant: "desktop" | "tablet" }) {
  return (
    <div
      className={variant === "desktop" ? "hidden lg:block" : "hidden md:block lg:hidden"}
      style={{ height: variant === "desktop" ? "var(--store-desktop-header-height, 4rem)" : "var(--store-tablet-header-height, 3.25rem)" }}
    />
  );
}

/** 前台宽屏壳层：仅 md/lg 追加顶栏与上内边距，不改变 &lt;768px 布局 */
export default function StoreShell({ children }: StoreShellProps) {
  const { pathname } = useLocation();
  const isTab = isStoreTabPath(pathname);
  const hideChrome = pathname.startsWith("/checkout");
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const isTablet = useMediaQuery("(min-width: 768px) and (max-width: 1023px)");

  return (
    <div className="store-shell relative min-h-[100dvh]">
      {!hideChrome && isDesktop ? (
        <Suspense fallback={<StoreHeaderFallback variant="desktop" />}>
          <StoreDesktopHeader />
        </Suspense>
      ) : null}
      {!hideChrome && isTab && isTablet ? (
        <Suspense fallback={<StoreHeaderFallback variant="tablet" />}>
          <StoreTabletBar />
        </Suspense>
      ) : null}
      <div>{children}</div>
    </div>
  );
}

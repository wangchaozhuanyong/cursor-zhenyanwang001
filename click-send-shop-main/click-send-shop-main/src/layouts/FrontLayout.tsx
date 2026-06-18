import React, { lazy, Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { DelayedRouteFallback, StoreTabContentFallback } from "@/components/AppRouteFallback";
import FrontPageTransition from "@/components/FrontPageTransition";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import StoreShell from "@/layouts/StoreShell";
import { isStoreTabPath } from "@/utils/storeBottomInset";
import { stripPublicLocaleFromPathname } from "@/i18n/publicLocale";

const BottomNav = lazy(() => import("@/components/BottomNav"));

/**
 * 前台带底栏布局。全站页脚仅由未登录首页 V2 内置的 GuestMobileFooter 提供；
 * 此处不再渲染 SiteFooter，避免分类/购物车/会员首页等出现页脚。
 */
const FrontLayout = React.forwardRef<HTMLDivElement>((_, ref) => {
  const location = useLocation();
  const isMobile = useMediaQuery("(max-width: 767px)");

  useEffect(() => {
    const path = stripPublicLocaleFromPathname(location.pathname);
    if (!isStoreTabPath(path)) {
      document.documentElement.removeAttribute("data-store-tab-route");
      return;
    }
    document.documentElement.setAttribute(
      "data-store-tab-route",
      path === "/" ? "home" : path.slice(1),
    );
    return () => document.documentElement.removeAttribute("data-store-tab-route");
  }, [location.pathname]);

  return (
    <div ref={ref} className="relative overflow-x-clip">
      <StoreShell>
        <div className="relative isolate w-full">
          <FrontPageTransition>
            <Suspense fallback={<DelayedRouteFallback fallback={<StoreTabContentFallback />} delayMs={140} />}>
              <Outlet />
            </Suspense>
          </FrontPageTransition>
        </div>
        {isMobile ? (
          <Suspense fallback={null}>
            <BottomNav />
          </Suspense>
        ) : null}
      </StoreShell>
    </div>
  );
});

FrontLayout.displayName = "FrontLayout";

export default FrontLayout;

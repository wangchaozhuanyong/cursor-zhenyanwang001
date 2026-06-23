import React, { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { DelayedRouteFallback } from "@/components/AppRouteFallback";
import FrontPageTransition from "@/components/FrontPageTransition";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import StoreShell from "@/layouts/StoreShell";
import { isStoreTabPath } from "@/utils/storeBottomInset";
import { stripPublicLocaleFromPathname } from "@/i18n/publicLocale";

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
    <div ref={ref} className="store-front-layout relative min-w-0 overflow-x-clip">
      <StoreShell>
        <div className="store-front-layout__content relative isolate w-full min-w-0">
          <FrontPageTransition>
            <Suspense fallback={<DelayedRouteFallback fallback={null} delayMs={260} />}>
              <Outlet />
            </Suspense>
          </FrontPageTransition>
        </div>
        {isMobile ? <BottomNav /> : null}
      </StoreShell>
    </div>
  );
});

FrontLayout.displayName = "FrontLayout";

export default FrontLayout;

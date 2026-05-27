import React, { Suspense, useEffect, useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { StoreOutletFallback } from "@/components/AppRouteFallback";
import FrontPageTransition from "@/components/FrontPageTransition";
import {
  StoreScrollChromeProvider,
  useStoreScrollChrome,
  useStoreScrollChromeActions,
} from "@/contexts/StoreScrollChromeProvider";
import StoreShell from "@/layouts/StoreShell";
import { isStoreTabPath } from "@/utils/storeBottomInset";

function shouldAutoHideBottomNav(pathname: string): boolean {
  return pathname === "/categories" || pathname === "/search" || pathname === "/new-arrivals";
}

function StoreScrollChromeRouteSync({ pathname }: { pathname: string }) {
  const { setAutoHideEnabled } = useStoreScrollChromeActions();
  const currentEnabled = useStoreScrollChrome((s) => s.autoHideEnabled);
  const desiredEnabled = shouldAutoHideBottomNav(pathname);
  useEffect(() => {
    if (currentEnabled === desiredEnabled) return;
    setAutoHideEnabled(desiredEnabled);
  }, [currentEnabled, desiredEnabled, setAutoHideEnabled]);
  return null;
}

/**
 * 前台带底栏布局。全站页脚仅由未登录首页 GuestHome 内置的 GuestMobileFooter 提供；
 * 此处不再渲染 SiteFooter，避免分类/购物车/会员首页等出现页脚。
 */
const FrontLayout = React.forwardRef<HTMLDivElement>((_, ref) => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useLayoutEffect(() => {
    if (navigationType === "POP") return;
    window.scrollTo(0, 0);
  }, [location.pathname, navigationType]);

  useEffect(() => {
    const path = location.pathname;
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
        <StoreScrollChromeProvider>
          <StoreScrollChromeRouteSync pathname={location.pathname} />
          <div className="relative isolate w-full">
            <FrontPageTransition>
              <Suspense fallback={<StoreOutletFallback />}>
                <Outlet />
              </Suspense>
            </FrontPageTransition>
          </div>
          <BottomNav />
        </StoreScrollChromeProvider>
      </StoreShell>
    </div>
  );
});

FrontLayout.displayName = "FrontLayout";

export default FrontLayout;

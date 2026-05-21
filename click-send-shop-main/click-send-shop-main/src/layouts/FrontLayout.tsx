import React, { Suspense, useEffect, useLayoutEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { StoreOutletFallback } from "@/components/AppRouteFallback";
import FrontPageTransition from "@/components/FrontPageTransition";
import { isStoreTabPath } from "@/utils/storeBottomInset";

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
      <div className="relative isolate w-full">
        <FrontPageTransition>
          <Suspense fallback={<StoreOutletFallback />}>
            <Outlet />
          </Suspense>
        </FrontPageTransition>
      </div>
      <BottomNav />
    </div>
  );
});

FrontLayout.displayName = "FrontLayout";

export default FrontLayout;

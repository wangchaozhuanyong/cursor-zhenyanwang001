import React, { Suspense, useEffect } from "react";
import { Outlet, useLocation, useNavigationType } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { ScrollBarsProvider } from "@/contexts/ScrollBarsContext";
import { StoreOutletFallback } from "@/components/AppRouteFallback";
import FrontPageTransition from "@/components/FrontPageTransition";
import { STORE_TAB_PATHS } from "@/utils/storeBottomInset";

/**
 * 前台带底栏布局。全站页脚仅由未登录首页 GuestHome 内置的 GuestMobileFooter 提供；
 * 此处不再渲染 SiteFooter，避免分类/购物车/会员首页等出现页脚。
 */
const FrontLayout = React.forwardRef<HTMLDivElement>((_, ref) => {
  const location = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [location.pathname, navigationType]);

  useEffect(() => {
    const path = location.pathname;
    if (!STORE_TAB_PATHS.has(path)) {
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
    <ScrollBarsProvider>
      <div ref={ref} className="relative min-h-0 overflow-x-clip">
        <div className="relative isolate min-h-0 w-full">
          <Suspense fallback={<StoreOutletFallback />}>
            <FrontPageTransition>
              <Outlet />
            </FrontPageTransition>
          </Suspense>
        </div>
        <BottomNav />
      </div>
    </ScrollBarsProvider>
  );
});

FrontLayout.displayName = "FrontLayout";

export default FrontLayout;

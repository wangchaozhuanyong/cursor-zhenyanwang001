import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import SiteFooter from "@/components/SiteFooter";
import { ScrollBarsProvider } from "@/contexts/ScrollBarsContext";
import { isLoggedIn } from "@/utils/token";

const FrontLayout = React.forwardRef<HTMLDivElement>((_, ref) => {
  const { pathname } = useLocation();
  /**
   * 未登录首页 GuestHome 自带移动端折叠页脚；若仍渲染全局 SiteFooter，
   * 用户滚动到底只会看到旧版页脚，误以为「改版没生效」。
   * 已登录首页 MemberHome 仍依赖下方 SiteFooter。
   */
  const showSiteFooter = !(pathname === "/" && !isLoggedIn());

  return (
    <ScrollBarsProvider>
      <div ref={ref}>
        <Outlet />
        {showSiteFooter ? <SiteFooter /> : null}
        <BottomNav />
      </div>
    </ScrollBarsProvider>
  );
});

FrontLayout.displayName = "FrontLayout";

export default FrontLayout;

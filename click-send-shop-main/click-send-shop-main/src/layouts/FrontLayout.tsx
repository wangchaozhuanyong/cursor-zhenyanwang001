import React from "react";
import { Outlet } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { ScrollBarsProvider } from "@/contexts/ScrollBarsContext";

/**
 * 前台带底栏布局。全站页脚仅由未登录首页 GuestHome 内置的 GuestMobileFooter 提供；
 * 此处不再渲染 SiteFooter，避免分类/购物车/会员首页等出现页脚。
 */
const FrontLayout = React.forwardRef<HTMLDivElement>((_, ref) => {
  return (
    <ScrollBarsProvider>
      <div ref={ref}>
        <Outlet />
        <BottomNav />
      </div>
    </ScrollBarsProvider>
  );
});

FrontLayout.displayName = "FrontLayout";

export default FrontLayout;

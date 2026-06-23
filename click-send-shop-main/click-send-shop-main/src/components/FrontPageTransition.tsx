import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AnimatedPage } from "@/modules/micro-interactions/components/AnimatedPage";
import { isStoreTabPath } from "@/utils/storeBottomInset";
import { shouldDisableStoreRouteTransform } from "@/utils/frontPageTransition";

/**
 * 底栏 Tab 之间切换不做整页 exit/wait 动画，避免父级 min-h-0 + absolute 退出导致白屏。
 * 非 Tab 路由仍使用 AnimatedPage 的轻量过渡。
 */
export default function FrontPageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const isTabRoute = isStoreTabPath(pathname);
  const disableTransform = shouldDisableStoreRouteTransform(pathname);

  return (
    <AnimatedPage
      className={isTabRoute ? "store-tab-route-transition" : undefined}
      disableAnimation={isTabRoute}
      disableTransform={disableTransform}
    >
      {children}
    </AnimatedPage>
  );
}

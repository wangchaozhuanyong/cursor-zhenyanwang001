import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AnimatedPage } from "@/modules/micro-interactions";
import { isStoreTabPath } from "@/utils/storeBottomInset";

/**
 * 底栏 Tab 之间切换不做整页 exit/wait 动画，避免父级 min-h-0 + absolute 退出导致白屏。
 * 非 Tab 路由仍使用 AnimatedPage 的轻量过渡。
 */
export default function FrontPageTransition({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  if (isStoreTabPath(pathname)) {
    return <div className="relative w-full">{children}</div>;
  }

  return <AnimatedPage>{children}</AnimatedPage>;
}

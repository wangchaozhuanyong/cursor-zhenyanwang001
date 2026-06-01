import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import StoreDesktopHeader from "@/components/store/StoreDesktopHeader.tsx";
import StoreTabletBar from "@/components/store/StoreTabletBar.tsx";
import { isStoreTabPath } from "@/utils/storeBottomInset";

type StoreShellProps = {
  children: ReactNode;
};

/** 前台宽屏壳层：仅 md/lg 追加顶栏与上内边距，不改变 &lt;768px 布局 */
export default function StoreShell({ children }: StoreShellProps) {
  const { pathname } = useLocation();
  const isTab = isStoreTabPath(pathname);
  const hideChrome = pathname.startsWith("/checkout");

  return (
    <div className="store-shell relative min-h-[100dvh]">
      {!hideChrome ? <StoreDesktopHeader /> : null}
      {!hideChrome && isTab ? <StoreTabletBar /> : null}
      <div>{children}</div>
    </div>
  );
}

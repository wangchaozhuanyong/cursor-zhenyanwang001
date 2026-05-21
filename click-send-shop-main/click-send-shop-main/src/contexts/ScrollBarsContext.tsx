import { createContext, useContext, type ReactNode } from "react";
import { useSmartBars } from "@/hooks/useSmartBars";

const BarsHiddenContext = createContext(false);

/**
 * 滚动时隐藏顶/底栏的 Provider。当前前台未使用 {@link useScrollBarsHidden}，
 * 请勿在 FrontLayout 挂载，避免滚动触发整树重渲染。
 */
export function ScrollBarsProvider({ children }: { children: ReactNode }) {
  const barsHidden = useSmartBars({ hideAfter: 50, showOnUp: 10 });
  return <BarsHiddenContext.Provider value={barsHidden}>{children}</BarsHiddenContext.Provider>;
}

export function useScrollBarsHidden(): boolean {
  return useContext(BarsHiddenContext);
}

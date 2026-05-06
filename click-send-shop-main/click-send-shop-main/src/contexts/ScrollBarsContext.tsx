import { createContext, useContext, type ReactNode } from "react";
import { useSmartBars } from "@/hooks/useSmartBars";

const BarsHiddenContext = createContext(false);

export function ScrollBarsProvider({ children }: { children: ReactNode }) {
  const barsHidden = useSmartBars({ hideAfter: 50, showOnUp: 10 });
  return <BarsHiddenContext.Provider value={barsHidden}>{children}</BarsHiddenContext.Provider>;
}

export function useScrollBarsHidden(): boolean {
  return useContext(BarsHiddenContext);
}

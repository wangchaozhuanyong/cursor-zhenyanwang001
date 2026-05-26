import { useEffect, useState } from "react";
import type { AppBreakpoint } from "./modalBreakpoints";
import { MQ_DESKTOP, MQ_MOBILE, MQ_TABLET } from "./modalBreakpoints";

function resolveBreakpoint(): AppBreakpoint {
  if (typeof window === "undefined") return "mobile";
  if (window.matchMedia(MQ_MOBILE).matches) return "mobile";
  if (window.matchMedia(MQ_TABLET).matches) return "tablet";
  if (window.matchMedia(MQ_DESKTOP).matches) return "desktop";
  return "mobile";
}

/** 当前视口档位：mobile / tablet / desktop */
export function useAppBreakpoint(): AppBreakpoint {
  const [bp, setBp] = useState<AppBreakpoint>(resolveBreakpoint);

  useEffect(() => {
    const queries = [MQ_MOBILE, MQ_TABLET, MQ_DESKTOP].map((q) => window.matchMedia(q));
    const sync = () => setBp(resolveBreakpoint());
    sync();
    queries.forEach((mq) => mq.addEventListener("change", sync));
    return () => queries.forEach((mq) => mq.removeEventListener("change", sync));
  }, []);

  return bp;
}

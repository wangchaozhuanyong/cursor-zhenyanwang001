import { useEffect, useRef, useState } from "react";

type UseSmartBarsOptions = {
  hideAfter?: number;
  showOnUp?: number;
};

export function useSmartBars({
  hideAfter = 50,
  showOnUp = 10,
}: UseSmartBarsOptions = {}) {
  const [hidden, setHidden] = useState(false);
  const lastYRef = useRef(0);
  const downAccumulatedRef = useRef(0);
  const upAccumulatedRef = useRef(0);
  const tickingRef = useRef(false);

  useEffect(() => {
    lastYRef.current = window.scrollY || 0;

    const onScroll = () => {
      if (tickingRef.current) return;
      tickingRef.current = true;

      requestAnimationFrame(() => {
        const currentY = window.scrollY || 0;
        const delta = currentY - lastYRef.current;
        const absDelta = Math.abs(delta);

        if (absDelta < 1) {
          tickingRef.current = false;
          return;
        }

        if (delta > 0) {
          downAccumulatedRef.current += delta;
          upAccumulatedRef.current = 0;

          if (currentY > hideAfter && downAccumulatedRef.current >= hideAfter) {
            setHidden(true);
            downAccumulatedRef.current = 0;
          }
        } else {
          upAccumulatedRef.current += -delta;
          downAccumulatedRef.current = 0;

          if (upAccumulatedRef.current >= showOnUp) {
            setHidden(false);
            upAccumulatedRef.current = 0;
          }
        }

        lastYRef.current = currentY;
        tickingRef.current = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [hideAfter, showOnUp]);

  return hidden;
}

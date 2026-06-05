import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

export type SmartMobileChromeMode = "expanded" | "compact" | "hidden";

export type SmartMobileChromeOptions = {
  measureKey?: string | number;
  expandTop?: number;
  compactStart?: number;
  hideStart?: number;
  hideDelta?: number;
  revealDelta?: number;
  touchDelta?: number;
  guardMs?: number;
};

export type SmartMobileChromeTransitionInput = {
  currentMode: SmartMobileChromeMode;
  currentY: number;
  delta: number;
  expandTop: number;
  compactStart: number;
  hideStart: number;
  hideDelta: number;
  revealDelta: number;
};

const DEFAULT_EXPAND_TOP = 16;
const DEFAULT_COMPACT_START = 56;
const DEFAULT_HIDE_START = 148;
const DEFAULT_HIDE_DELTA = 18;
const DEFAULT_REVEAL_DELTA = 8;
const DEFAULT_TOUCH_DELTA = 18;
const DEFAULT_GUARD_MS = 180;

function getScrollY() {
  return window.scrollY || document.documentElement.scrollTop || 0;
}

export function getNextSmartMobileChromeMode({
  currentMode,
  currentY,
  delta,
  expandTop,
  compactStart,
  hideStart,
  hideDelta,
  revealDelta,
}: SmartMobileChromeTransitionInput): SmartMobileChromeMode {
  if (currentY <= expandTop) return "expanded";

  if (delta < -revealDelta) return "expanded";

  if (Math.abs(delta) < Math.min(hideDelta, revealDelta)) {
    if (currentMode === "expanded" && currentY > compactStart) return "compact";
    return currentMode;
  }

  if (delta > hideDelta && currentY > hideStart) return "hidden";
  if (delta > 0 && currentY > compactStart) return "compact";

  return currentMode;
}

export function useSmartMobileChrome({
  measureKey = "",
  expandTop = DEFAULT_EXPAND_TOP,
  compactStart = DEFAULT_COMPACT_START,
  hideStart = DEFAULT_HIDE_START,
  hideDelta = DEFAULT_HIDE_DELTA,
  revealDelta = DEFAULT_REVEAL_DELTA,
  touchDelta = DEFAULT_TOUCH_DELTA,
  guardMs = DEFAULT_GUARD_MS,
}: SmartMobileChromeOptions = {}) {
  const chromeRef = useRef<HTMLDivElement>(null);
  const [chromeHeight, setChromeHeight] = useState(0);
  const [mode, setMode] = useState<SmartMobileChromeMode>("expanded");
  const modeRef = useRef<SmartMobileChromeMode>("expanded");
  const lastScrollYRef = useRef(0);
  const scrollTickingRef = useRef(false);
  const layoutGuardUntilRef = useRef(0);
  const touchStartYRef = useRef(0);

  const setModeStable = useCallback((nextMode: SmartMobileChromeMode) => {
    if (modeRef.current === nextMode) return false;
    modeRef.current = nextMode;
    setMode(nextMode);
    return true;
  }, []);

  const revealChrome = useCallback(() => {
    if (setModeStable("expanded")) {
      layoutGuardUntilRef.current = 0;
    }
  }, [setModeStable]);

  const compactChrome = useCallback(() => {
    if (setModeStable("compact")) {
      layoutGuardUntilRef.current = 0;
    }
  }, [setModeStable]);

  const hideChrome = useCallback(() => {
    if (setModeStable("hidden")) {
      layoutGuardUntilRef.current = window.performance.now() + guardMs;
    }
  }, [guardMs, setModeStable]);

  const applyMode = useCallback((nextMode: SmartMobileChromeMode) => {
    if (nextMode === "expanded") {
      revealChrome();
      return;
    }

    if (nextMode === "compact") {
      compactChrome();
      return;
    }

    hideChrome();
  }, [compactChrome, hideChrome, revealChrome]);

  useLayoutEffect(() => {
    const node = chromeRef.current;
    if (!node) return;

    const update = () => {
      const nextHeight = node.offsetHeight || 0;
      if (!nextHeight) return;

      setChromeHeight((prev) => {
        if (modeRef.current === "expanded") return nextHeight;
        return prev || nextHeight;
      });
    };

    update();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", update);
      return () => window.removeEventListener("resize", update);
    }

    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [measureKey]);

  useEffect(() => {
    const resolveTransition = (currentY: number, delta: number) => getNextSmartMobileChromeMode({
      currentMode: modeRef.current,
      currentY,
      delta,
      expandTop,
      compactStart,
      hideStart,
      hideDelta,
      revealDelta,
    });

    const updateChromeVisibility = () => {
      scrollTickingRef.current = false;

      const currentY = getScrollY();
      const delta = currentY - lastScrollYRef.current;
      lastScrollYRef.current = currentY;

      if (window.performance.now() < layoutGuardUntilRef.current) return;

      applyMode(resolveTransition(currentY, delta));
    };

    const handleScroll = () => {
      if (scrollTickingRef.current) return;
      scrollTickingRef.current = true;
      window.requestAnimationFrame(updateChromeVisibility);
    };

    const handleWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) < revealDelta) return;

      lastScrollYRef.current = getScrollY();

      if (event.deltaY < 0) {
        revealChrome();
        return;
      }

      applyMode(resolveTransition(lastScrollYRef.current, event.deltaY));
    };

    const handleTouchStart = (event: TouchEvent) => {
      touchStartYRef.current = event.touches[0]?.clientY ?? 0;
    };

    const handleTouchMove = (event: TouchEvent) => {
      const currentTouchY = event.touches[0]?.clientY;
      if (currentTouchY === undefined) return;

      const gestureDelta = touchStartYRef.current - currentTouchY;
      if (Math.abs(gestureDelta) < touchDelta) return;

      lastScrollYRef.current = getScrollY();
      touchStartYRef.current = currentTouchY;

      if (gestureDelta < 0) {
        revealChrome();
        return;
      }

      applyMode(resolveTransition(lastScrollYRef.current, gestureDelta));
    };

    const forceReveal = () => {
      lastScrollYRef.current = getScrollY();
      revealChrome();
    };

    lastScrollYRef.current = getScrollY();
    applyMode(resolveTransition(lastScrollYRef.current, 0));

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("focusin", forceReveal);
    window.addEventListener("resize", forceReveal);

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("focusin", forceReveal);
      window.removeEventListener("resize", forceReveal);
    };
  }, [applyMode, compactStart, expandTop, hideDelta, hideStart, revealChrome, revealDelta, touchDelta]);

  return {
    chromeRef,
    chromeHeight,
    mode,
    isCompact: mode === "compact",
    isHidden: mode === "hidden",
    revealChrome,
    compactChrome,
    hideChrome,
  };
}

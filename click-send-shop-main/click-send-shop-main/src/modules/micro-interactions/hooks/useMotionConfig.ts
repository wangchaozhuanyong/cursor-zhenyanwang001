import { useMemo, useSyncExternalStore } from "react";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import type { MotionTier } from "../motionConfig";

type LegacyMediaQueryList = MediaQueryList & {
  addListener?: (listener: (event: MediaQueryListEvent) => void) => void;
  removeListener?: (listener: (event: MediaQueryListEvent) => void) => void;
};

let reducedMotionQuery: LegacyMediaQueryList | null = null;

function getReducedMotionQuery() {
  if (typeof window === "undefined") return null;
  if (!reducedMotionQuery) {
    reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  }
  return reducedMotionQuery;
}

function subscribeReducedMotion(onStoreChange: () => void) {
  const query = getReducedMotionQuery();
  if (!query) return () => undefined;
  const onChange = () => onStoreChange();
  if (typeof query.addEventListener === "function") {
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }
  query.addListener?.(onChange);
  return () => query.removeListener?.(onChange);
}

function getReducedMotionSnapshot() {
  return getReducedMotionQuery()?.matches ?? false;
}

export function useMotionConfig() {
  const { themeConfig } = useThemeRuntime();
  const reduced = useSyncExternalStore(subscribeReducedMotion, getReducedMotionSnapshot, () => false);

  const level: MotionTier = useMemo(
    () => (reduced ? "none" : themeConfig.motionLevel),
    [reduced, themeConfig],
  );

  const enabled = useMemo(
    () => !reduced && themeConfig.motionLevel !== "none",
    [reduced, themeConfig],
  );

  return { level, enabled, reduced, themeConfig };
}

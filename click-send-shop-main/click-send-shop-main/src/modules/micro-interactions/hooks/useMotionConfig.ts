import { useEffect, useMemo, useState } from "react";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import {
  getMotionEnabled,
  prefersReducedMotion,
  resolveMotionTier,
  type MotionTier,
} from "../motionConfig";

export function useMotionConfig() {
  const { themeConfig } = useThemeRuntime();
  const [reduced, setReduced] = useState(prefersReducedMotion);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onChange = () => setReduced(mq.matches);
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const level: MotionTier = useMemo(
    () => (reduced ? "none" : resolveMotionTier(themeConfig)),
    [reduced, themeConfig],
  );

  const enabled = useMemo(
    () => !reduced && getMotionEnabled(themeConfig),
    [reduced, themeConfig],
  );

  return { level, enabled, reduced, themeConfig };
}

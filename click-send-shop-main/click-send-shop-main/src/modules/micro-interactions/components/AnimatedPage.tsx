import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";

export function AnimatedPage({ children, className }: { children: ReactNode; className?: string }) {
  const location = useLocation();
  const { level, enabled } = useMotionConfig();
  const [entered, setEntered] = useState(!enabled);

  useEffect(() => {
    if (!enabled) {
      setEntered(true);
      return;
    }
    setEntered(false);
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [enabled, level, location.pathname]);

  const duration = level === "rich" ? 260 : 180;
  const y = level === "rich" ? 10 : 5;

  return (
    <div
      key={location.pathname}
      className={cn("store-route-transition relative w-full", className)}
      style={{
        backfaceVisibility: "hidden",
        transformOrigin: "50% 0%",
        opacity: enabled ? (entered ? 1 : 0) : undefined,
        transform: enabled
          ? entered
            ? "translate3d(0, 0, 0) scale(1)"
            : `translate3d(0, ${y}px, 0) scale(${level === "rich" ? 0.996 : 1})`
          : undefined,
        transition: enabled ? `opacity ${duration}ms ease-out, transform ${duration}ms ease-out` : undefined,
      }}
    >
      {children}
    </div>
  );
}

export default AnimatedPage;

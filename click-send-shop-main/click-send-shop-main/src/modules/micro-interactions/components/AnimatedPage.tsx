import { useEffect, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";

export function AnimatedPage({
  children,
  className,
  disableTransform = false,
  disableAnimation = false,
}: {
  children: ReactNode;
  className?: string;
  disableTransform?: boolean;
  disableAnimation?: boolean;
}) {
  const location = useLocation();
  const { level, enabled } = useMotionConfig();
  const [entered, setEntered] = useState(true);

  useEffect(() => {
    if (!enabled || disableAnimation) {
      setEntered(true);
      return;
    }
    setEntered(false);
    const raf = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(raf);
  }, [disableAnimation, enabled, level, location.pathname]);

  const shouldAnimate = enabled && !disableAnimation;
  const duration = level === "rich" ? 160 : 120;
  const y = level === "rich" ? 2 : 0;

  return (
    <div
      className={cn("store-route-transition relative w-full", className)}
      style={{
        backfaceVisibility: "hidden",
        transformOrigin: "50% 0%",
        opacity: shouldAnimate ? (entered ? 1 : 0.985) : undefined,
        transform: shouldAnimate && !disableTransform
          ? entered
            ? "translate3d(0, 0, 0) scale(1)"
            : `translate3d(0, ${y}px, 0) scale(1)`
          : undefined,
        transition: shouldAnimate
          ? disableTransform
            ? `opacity ${duration}ms ease-out`
            : `opacity ${duration}ms ease-out, transform ${duration}ms ease-out`
          : undefined,
      }}
    >
      {children}
    </div>
  );
}

export default AnimatedPage;

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { pageTransition } from "../motionConfig";

export function AnimatedPage({ children, className }: { children: ReactNode; className?: string }) {
  const location = useLocation();
  const { level, enabled } = useMotionConfig();
  const pageMotion = pageTransition(level);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  // pathname key: query-only updates (e.g. /categories filters) must not remount the whole page (location.key changes on replace).
  // mode="wait": avoid sync enter/exit stacking two full pages in document flow (mobile scroll duplication).
  return (
    <div className="relative isolate w-full">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={location.pathname}
          className={cn("relative w-full", className)}
          initial={pageMotion.initial}
          animate={pageMotion.animate}
          exit={pageMotion.exit}
          transition={pageMotion.transition}
          style={{ backfaceVisibility: "hidden", transformOrigin: "50% 0%" }}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

export default AnimatedPage;

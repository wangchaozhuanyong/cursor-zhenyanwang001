import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { pageTransition } from "../motionConfig";

export function AnimatedPage({ children, className }: { children: ReactNode; className?: string }) {
  const location = useLocation();
  const { level, enabled } = useMotionConfig();
  const pageMotion = pageTransition(level);

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={location.pathname}
      className={className}
      initial={pageMotion.initial}
      animate={pageMotion.animate}
      exit={pageMotion.exit}
      transition={pageMotion.transition}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedPage;

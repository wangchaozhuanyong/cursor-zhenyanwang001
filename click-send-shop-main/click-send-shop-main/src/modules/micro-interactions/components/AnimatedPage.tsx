import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { pageTransition } from "../motionConfig";

export function AnimatedPage({ children, className }: { children: ReactNode; className?: string }) {
  const location = useLocation();
  const { level, enabled } = useMotionConfig();
  const pageMotion = pageTransition(level);

  if (!enabled) {
    return <div className={cn("relative w-full", className)}>{children}</div>;
  }

  // pathname key：仅 query 变化（如分类筛选）不 remount 整页。
  // 无 AnimatePresence / exit：避免 wait 白屏、旧页堆叠、sticky + transform 残影。
  return (
    <motion.div
      key={location.pathname}
      className={cn("relative w-full", className)}
      initial={pageMotion.initial}
      animate={pageMotion.animate}
      transition={pageMotion.transition}
    >
      {children}
    </motion.div>
  );
}

export default AnimatedPage;

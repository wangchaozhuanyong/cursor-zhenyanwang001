import type { HTMLAttributes, ReactNode } from "react";
import { motion } from "framer-motion";
import { useMotionConfig } from "@/modules/micro-interactions";
import { listItemTransition } from "@/modules/micro-interactions/motionConfig";

type RevealProps = HTMLAttributes<HTMLDivElement> & {
  index?: number;
  children: ReactNode;
};

/** @deprecated Prefer AnimatedSection from micro-interactions */
export default function Reveal({
  index = 0,
  children,
  className = "",
  ...rest
}: RevealProps) {
  const { level, enabled } = useMotionConfig();
  const motionProps = listItemTransition(level, index);

  if (!enabled || level === "none") {
    return (
      <div className={className} {...rest}>
        {children}
      </div>
    );
  }

  return (
    <motion.div
      className={className}
      initial={motionProps.initial}
      animate={motionProps.animate}
      exit={motionProps.exit}
      transition={motionProps.transition}
      style={{ backfaceVisibility: "hidden", transformOrigin: "50% 50%" }}
      {...(rest as any)}
    >
      {children}
    </motion.div>
  );
}

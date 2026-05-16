import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { shakeKeyframes } from "../motionConfig";

type FormFieldShakeProps = {
  children: ReactNode;
  /** 为 true 或递增数字时触发一次抖动 */
  shake?: boolean | number;
  className?: string;
};

export function FormFieldShake({ children, shake, className }: FormFieldShakeProps) {
  const { level, enabled } = useMotionConfig();
  const trigger = shake === true || (typeof shake === "number" && shake > 0);
  const key = typeof shake === "number" ? shake : trigger ? 1 : 0;

  if (!enabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      key={key}
      className={cn(className)}
      initial={false}
      animate={trigger ? shakeKeyframes(level) : { x: 0 }}
      transition={{ duration: level === "rich" ? 0.4 : 0.32 }}
    >
      {children}
    </motion.div>
  );
}

export default FormFieldShake;

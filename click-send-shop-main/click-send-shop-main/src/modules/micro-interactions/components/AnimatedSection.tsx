import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { sectionTransition } from "../motionConfig";

type AnimatedSectionAs = "section" | "div";

type AnimatedSectionProps = {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: AnimatedSectionAs;
  once?: boolean;
};

export function AnimatedSection({
  children,
  className,
  delay = 0,
  as = "section",
  once = true,
}: AnimatedSectionProps) {
  const { level, enabled } = useMotionConfig();
  const ref = useRef<HTMLElement | null>(null);
  const [visible, setVisible] = useState(!enabled);
  const MotionTag = as === "section" ? motion.section : motion.div;

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setVisible(true);
          if (once) observer.disconnect();
        } else if (!once) {
          setVisible(false);
        }
      },
      { threshold: 0.08, rootMargin: "0px 0px -4% 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [enabled, once]);

  const motionProps = sectionTransition(level, delay);

  if (!enabled) {
    const Tag = as === "section" ? "section" : "div";
    return (
      <Tag className={className} ref={ref as never}>
        {children}
      </Tag>
    );
  }

  return (
    <MotionTag
      ref={ref as never}
      className={cn(className)}
      initial={motionProps.initial}
      animate={visible ? motionProps.animate : motionProps.initial}
      transition={motionProps.transition}
    >
      {children}
    </MotionTag>
  );
}

export default AnimatedSection;

import type { HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";
import { sectionTransition } from "../motionConfig";

type AnimatedSectionAs = "section" | "motion.div" | "div";

type AnimatedSectionProps = HTMLAttributes<HTMLElement> & {
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
  ...rest
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
      <Tag className={cn(className)} ref={ref as never} {...rest}>
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
      {...(rest as any)}
    >
      {children}
    </MotionTag>
  );
}

export default AnimatedSection;

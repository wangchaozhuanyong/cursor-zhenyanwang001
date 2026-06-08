import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";

type AnimatedSectionAs = "section" | "motion.div" | "div";

type AnimatedSectionProps = HTMLAttributes<HTMLElement> & {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: AnimatedSectionAs;
  once?: boolean;
  persistKey?: string;
};

const visibleSectionKeys = new Set<string>();

function getVisibleSectionKey({
  as,
  className,
  delay,
  persistKey,
}: {
  as: AnimatedSectionAs;
  className?: string;
  delay: number;
  persistKey?: string;
}) {
  if (persistKey) return persistKey;
  return `${as}:${delay}:${String(className || "").trim() || "default"}`;
}

export function AnimatedSection({
  children,
  className,
  delay = 0,
  as = "section",
  once = true,
  persistKey,
  style,
  ...rest
}: AnimatedSectionProps) {
  const { level, enabled } = useMotionConfig();
  const ref = useRef<HTMLElement | null>(null);
  const sectionKey = getVisibleSectionKey({ as, className, delay, persistKey });
  const [visible, setVisible] = useState(() => !enabled || (once && visibleSectionKeys.has(sectionKey)));

  useEffect(() => {
    if (!enabled) {
      setVisible(true);
      return;
    }
    const node = ref.current;
    if (!node) return;
    if (typeof IntersectionObserver === "undefined") {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          if (once) visibleSectionKeys.add(sectionKey);
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
  }, [enabled, once, sectionKey]);

  const Tag = as === "section" ? "section" : "div";
  const y = level === "rich" ? 12 : 6;
  const duration = level === "rich" ? 280 : 220;
  const delayMs = Math.max(0, delay * 1000);
  const animationStyle: CSSProperties | undefined = enabled
    ? {
        ...style,
        opacity: visible ? 1 : 0,
        transform: visible ? "translate3d(0, 0, 0)" : `translate3d(0, ${y}px, 0)`,
        transition: `opacity ${duration}ms ease-out ${delayMs}ms, transform ${duration}ms ease-out ${delayMs}ms`,
        willChange: visible ? style?.willChange : "opacity, transform",
      }
    : style;

  return (
    <Tag
      ref={ref as never}
      className={cn(className)}
      style={animationStyle}
      {...rest}
    >
      {children}
    </Tag>
  );
}

export default AnimatedSection;

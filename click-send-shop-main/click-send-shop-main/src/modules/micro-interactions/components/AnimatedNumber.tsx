import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { useMotionConfig } from "../hooks/useMotionConfig";

type AnimatedNumberProps = {
  value: number;
  className?: string;
  format?: (n: number) => string;
  decimals?: number;
};

export function AnimatedNumber({
  value,
  className,
  format,
  decimals = 0,
}: AnimatedNumberProps) {
  const { level, enabled } = useMotionConfig();
  const spring = useSpring(value, { stiffness: 120, damping: 20 });
  const display = useTransform(spring, (v) => {
    const n = decimals > 0 ? v.toFixed(decimals) : String(Math.round(v));
    return format ? format(Number(n)) : n;
  });
  const [text, setText] = useState(() => (format ? format(value) : String(value)));
  const prev = useRef(value);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setText(format ? format(value) : String(value));
      return;
    }
    spring.set(value);
    const unsub = display.on("change", (v) => setText(v));
    if (prev.current !== value) {
      setFlash(true);
      const t = window.setTimeout(() => setFlash(false), level === "rich" ? 400 : 280);
      prev.current = value;
      return () => {
        unsub();
        window.clearTimeout(t);
      };
    }
    prev.current = value;
    return unsub;
  }, [value, spring, display, enabled, format, level]);

  if (!enabled) {
    return <span className={cn("tabular-nums", className)}>{format ? format(value) : value}</span>;
  }

  return (
    <motion.span
      className={cn("tabular-nums", className)}
      animate={flash ? { color: ["var(--theme-price)", "var(--theme-text)"] } : {}}
      transition={{ duration: level === "rich" ? 0.4 : 0.25 }}
    >
      {text}
    </motion.span>
  );
}

export default AnimatedNumber;

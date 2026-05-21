import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useMotionConfig } from "@/modules/micro-interactions";
import { silkTransition } from "@/modules/micro-interactions/motionConfig";

type SilkLoadMoreSentinelProps = {
  onVisible?: () => void;
  disabled?: boolean;
  loading?: boolean;
};

export default function SilkLoadMoreSentinel({
  onVisible,
  disabled = false,
  loading = false,
}: SilkLoadMoreSentinelProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const { enabled, level } = useMotionConfig();

  useEffect(() => {
    const node = ref.current;
    if (!node || disabled || !onVisible) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) onVisible();
      },
      { rootMargin: "220px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [disabled, onVisible]);

  const bar = (
    <div ref={ref} className="flex h-14 items-center justify-center" aria-hidden={!loading}>
      {loading ? (
        <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-border)_60%,var(--theme-bg))]">
          <span className="silk-refresh-line block h-full w-1/2 rounded-full bg-[var(--theme-primary)]" />
        </div>
      ) : null}
    </div>
  );

  if (!enabled || level === "none") return bar;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={silkTransition(0.18)}
    >
      {bar}
    </motion.div>
  );
}

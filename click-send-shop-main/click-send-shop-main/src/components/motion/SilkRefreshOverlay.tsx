import { motion } from "framer-motion";
import { useMotionConfig } from "@/modules/micro-interactions";
import { silkTransition } from "@/modules/micro-interactions/motionConfig";
import { cn } from "@/lib/utils";

type SilkRefreshOverlayProps = {
  show: boolean;
  className?: string;
  label?: string;
};

export default function SilkRefreshOverlay({
  show,
  className,
  label = "正在更新",
}: SilkRefreshOverlayProps) {
  const { enabled, level } = useMotionConfig();

  if (!show) return null;

  const content = (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-3 pt-2",
        className,
      )}
      aria-live="polite"
      aria-label={label}
    >
      <div className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)]/90 px-3 py-2 text-xs text-[var(--theme-text-muted)] shadow-sm backdrop-blur-md">
        <span className="mr-2 inline-block h-1.5 w-10 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-border)_60%,var(--theme-bg))] align-middle">
          <span className="silk-refresh-line block h-full w-1/2 rounded-full bg-[var(--theme-primary)]" />
        </span>
        {label}
      </div>
    </div>
  );

  if (!enabled || level === "none") return content;

  return (
    <motion.div
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={silkTransition(level === "rich" ? 0.22 : 0.16)}
    >
      {content}
    </motion.div>
  );
}

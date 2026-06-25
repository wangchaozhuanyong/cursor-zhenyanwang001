import { useMotionConfig } from "@/modules/micro-interactions/hooks/useMotionConfig";
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

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center px-3 pt-2",
        enabled && level !== "none" && "animate-[store-refresh-fade-in_180ms_ease-out]",
        className,
      )}
      aria-live="polite"
      aria-label={label}
    >
      <div className="sf-next-theme-radius border border-[var(--theme-border)] bg-[var(--theme-surface)]/90 px-3 py-2 text-xs text-[var(--theme-text-muted)] shadow-sm backdrop-blur-md">
        <span className="mr-2 inline-block h-1.5 w-10 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--theme-border)_60%,var(--theme-bg))] align-middle">
          <span className="silk-refresh-line block h-full w-1/2 rounded-full bg-[var(--theme-primary)]" />
        </span>
        {label}
      </div>
    </div>
  );
}

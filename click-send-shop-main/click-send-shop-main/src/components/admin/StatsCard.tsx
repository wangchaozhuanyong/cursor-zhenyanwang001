import { LucideIcon } from "lucide-react";
import { AnimatedNumber } from "@/modules/micro-interactions";
import { THEME_TEXT_DANGER, THEME_TEXT_SUCCESS } from "@/utils/themeVisuals";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
  onClick?: () => void;
}

export default function StatsCard({ icon: Icon, label, value, change, trend, onClick }: StatsCardProps) {
  const interactive = Boolean(onClick);
  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onClick={onClick}
      onKeyDown={interactive ? (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      } : undefined}
      className={`rounded-xl border border-border bg-card p-3 sm:p-4 ${interactive ? "cursor-pointer transition-colors hover:bg-[var(--theme-bg)] active:bg-[var(--theme-bg)]" : ""}`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</span>
        <Icon size={16} className="shrink-0 text-[var(--theme-primary)]" />
      </div>
      <p className="mt-1.5 truncate text-lg font-bold tabular-nums text-foreground sm:mt-2 sm:text-2xl">
        {typeof value === "number" ? <AnimatedNumber value={value} /> : value}
      </p>
      {change && (
        <p className={`mt-1 text-[10px] font-medium ${
          trend === "up" ? THEME_TEXT_SUCCESS : trend === "down" ? THEME_TEXT_DANGER : "text-muted-foreground"
        }`}>
          {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{change}
        </p>
      )}
    </div>
  );
}

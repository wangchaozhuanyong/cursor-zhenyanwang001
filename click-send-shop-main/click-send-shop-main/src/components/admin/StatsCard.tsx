import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  change?: string;
  trend?: "up" | "down";
}

export default function StatsCard({ icon: Icon, label, value, change, trend }: StatsCardProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] leading-tight text-muted-foreground sm:text-xs">{label}</span>
        <Icon size={16} className="shrink-0 text-gold" />
      </div>
      <p className="mt-1.5 truncate text-lg font-bold tabular-nums text-foreground sm:mt-2 sm:text-2xl">{value}</p>
      {change && (
        <p className={`mt-1 text-[10px] font-medium ${
          trend === "up" ? "text-emerald-500" : trend === "down" ? "text-red-500" : "text-muted-foreground"
        }`}>
          {trend === "up" ? "↑ " : trend === "down" ? "↓ " : ""}{change}
        </p>
      )}
    </div>
  );
}

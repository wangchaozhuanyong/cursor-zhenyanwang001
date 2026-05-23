import { AlertTriangle, Info } from "lucide-react";
import type { ReportAlert } from "@/utils/reportSummaryKpi";

const STYLES: Record<ReportAlert["type"], { border: string; bg: string; icon: typeof AlertTriangle }> = {
  missing_cost: {
    border: "border-amber-500/40",
    bg: "bg-amber-500/10",
    icon: AlertTriangle,
  },
  degraded: {
    border: "border-sky-500/40",
    bg: "bg-sky-500/10",
    icon: Info,
  },
  incomplete: {
    border: "border-[var(--theme-border)]",
    bg: "bg-secondary/50",
    icon: Info,
  },
};

type Props = {
  alerts: ReportAlert[];
};

export default function ReportAlertBanners({ alerts }: Props) {
  if (alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      {alerts.map((alert, index) => {
        const style = STYLES[alert.type];
        const Icon = style.icon;
        return (
          <div
            key={`${alert.type}-${index}`}
            className={`flex gap-2 rounded-xl border px-3 py-2.5 text-sm ${style.border} ${style.bg}`}
          >
            <Icon size={16} className="mt-0.5 shrink-0 text-[var(--theme-text-muted)]" />
            <p className="text-[var(--theme-text)]">{alert.message}</p>
          </div>
        );
      })}
    </div>
  );
}

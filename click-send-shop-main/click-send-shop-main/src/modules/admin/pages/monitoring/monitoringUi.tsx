/* eslint-disable react-refresh/only-export-components */
import type { MonitoringSeverity } from "@/services/admin/monitoringService";
import { useAdminT } from "@/hooks/useAdminT";
import { formatDateTime } from "@/utils/formatDateTime";
import {
  formatMonitoringSeverityLabel,
  formatMonitoringStatusLabel,
  MONITORING_SEVERITY_LABELS,
} from "./monitoringLabels";

export const severityClass: Record<MonitoringSeverity, string> = {
  P0: "bg-red-950 text-white",
  P1: "bg-red-600 text-white",
  P2: "bg-orange-100 text-orange-700",
  P3: "bg-blue-100 text-blue-700",
  INFO: "bg-[var(--theme-bg)] text-muted-foreground ring-1 ring-[var(--theme-border)]",
};

export const statusClass: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  investigating: "bg-orange-100 text-orange-700",
  repair_pending: "bg-blue-100 text-blue-700",
  repaired: "bg-emerald-100 text-emerald-700",
  resolved: "bg-emerald-100 text-emerald-700",
  ignored: "bg-[var(--theme-bg)] text-muted-foreground ring-1 ring-[var(--theme-border)]",
  running: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-orange-100 text-orange-700",
  approved: "bg-blue-100 text-blue-700",
  executed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-[var(--theme-bg)] text-muted-foreground ring-1 ring-[var(--theme-border)]",
};

export const monitoringPanelClass =
  "rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 shadow-sm";
export const monitoringInsetClass =
  "rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2";
export const monitoringHeadingClass = "text-base font-semibold text-foreground";
export const monitoringMutedClass = "text-muted-foreground";
export const monitoringTableHeadClass = "bg-[var(--theme-bg)] text-muted-foreground";
export const monitoringPrimaryButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-lg bg-foreground px-3 py-1.5 text-xs font-semibold text-background transition-colors hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";
export const monitoringSecondaryButtonClass =
  "inline-flex min-h-9 items-center justify-center rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-[var(--theme-bg)] disabled:cursor-not-allowed disabled:opacity-40";
export const monitoringInputClass =
  "rounded-lg border border-[var(--theme-border)] bg-[var(--theme-surface)] px-2 py-1.5 text-sm text-foreground outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20";
export const monitoringActionLinkClass = "font-semibold text-theme-price underline-offset-2 hover:underline";

function resolveBadgeLabel(value?: string | null): string {
  if (!value) return "-";
  const severity =
    MONITORING_SEVERITY_LABELS[value]
    || (typeof formatMonitoringSeverityLabel === "function" ? formatMonitoringSeverityLabel(value) : "");
  if (severity) return severity;
  return formatMonitoringStatusLabel(value);
}

export function Badge({ value, tone }: { value?: string | null; tone?: string }) {
  const { tText } = useAdminT();
  const className = tone || statusClass[value || ""] || severityClass[value as MonitoringSeverity] || "bg-[var(--theme-bg)] text-muted-foreground ring-1 ring-[var(--theme-border)]";
  const raw = resolveBadgeLabel(value);
  const label = raw === "-" ? raw : tText(raw);
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

export function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return formatDateTime(date);
}

export function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-lg border border-[var(--theme-border)] bg-[var(--theme-bg)] p-3 text-xs leading-5 text-muted-foreground">
      {JSON.stringify(data ?? null, null, 2)}
    </pre>
  );
}

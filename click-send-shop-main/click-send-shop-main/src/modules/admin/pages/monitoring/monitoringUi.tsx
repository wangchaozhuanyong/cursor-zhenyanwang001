/* eslint-disable react-refresh/only-export-components */
import type { MonitoringSeverity } from "@/services/admin/monitoringService";
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
  INFO: "bg-slate-100 text-slate-600",
};

export const statusClass: Record<string, string> = {
  open: "bg-red-100 text-red-700",
  investigating: "bg-orange-100 text-orange-700",
  repair_pending: "bg-blue-100 text-blue-700",
  repaired: "bg-emerald-100 text-emerald-700",
  resolved: "bg-emerald-100 text-emerald-700",
  ignored: "bg-slate-100 text-slate-600",
  running: "bg-blue-100 text-blue-700",
  success: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-orange-100 text-orange-700",
  approved: "bg-blue-100 text-blue-700",
  executed: "bg-emerald-100 text-emerald-700",
  cancelled: "bg-slate-100 text-slate-600",
};

function resolveBadgeLabel(value?: string | null): string {
  if (!value) return "-";
  const severity =
    MONITORING_SEVERITY_LABELS[value]
    || (typeof formatMonitoringSeverityLabel === "function" ? formatMonitoringSeverityLabel(value) : "");
  if (severity) return severity;
  return formatMonitoringStatusLabel(value);
}

export function Badge({ value, tone }: { value?: string | null; tone?: string }) {
  const className = tone || statusClass[value || ""] || severityClass[value as MonitoringSeverity] || "bg-slate-100 text-slate-600";
  const label = resolveBadgeLabel(value);
  return (
    <span className={`inline-flex shrink-0 whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${className}`}>
      {label}
    </span>
  );
}

export function formatTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString();
}

export function JsonBlock({ data }: { data: unknown }) {
  return (
    <pre className="max-h-80 overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
      {JSON.stringify(data ?? null, null, 2)}
    </pre>
  );
}

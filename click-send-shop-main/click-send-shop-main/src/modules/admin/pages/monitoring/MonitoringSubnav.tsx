import { NavLink } from "react-router-dom";
import type { MonitoringSeverity } from "@/api/admin/monitoring";

const tabs = [
  { label: "数据总览", to: "/admin/monitoring" },
  { label: "数据异常", to: "/admin/monitoring/anomalies" },
  { label: "修复任务", to: "/admin/monitoring/repair-tasks" },
  { label: "监控规则", to: "/admin/monitoring/rules" },
  { label: "运行记录", to: "/admin/monitoring/runs" },
];

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

export function Badge({ value, tone }: { value?: string | null; tone?: string }) {
  const className = tone || statusClass[value || ""] || "bg-slate-100 text-slate-600";
  return <span className={`inline-flex rounded px-2 py-0.5 text-xs font-semibold ${className}`}>{value || "-"}</span>;
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

export default function MonitoringSubnav() {
  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.to === "/admin/monitoring"}
          className={({ isActive }) => `rounded border px-3 py-2 text-sm font-semibold ${
            isActive ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
          }`}
        >
          {tab.label}
        </NavLink>
      ))}
    </div>
  );
}

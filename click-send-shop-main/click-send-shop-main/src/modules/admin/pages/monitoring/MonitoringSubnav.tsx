import { NavLink } from "react-router-dom";

const tabs = [
  { label: "数据总览", to: "/admin/monitoring" },
  { label: "数据异常", to: "/admin/monitoring/anomalies" },
  { label: "修复任务", to: "/admin/monitoring/repair-tasks" },
  { label: "监控规则", to: "/admin/monitoring/rules" },
  { label: "运行记录", to: "/admin/monitoring/runs" },
];

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

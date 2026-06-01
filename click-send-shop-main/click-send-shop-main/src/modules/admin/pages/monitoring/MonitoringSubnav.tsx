import { Tx } from "@/components/admin/AdminText";
import { NavLink } from "react-router-dom";
import { useAdminT } from "@/hooks/useAdminT";
import { monitoringSecondaryButtonClass } from "./monitoringUi";

const tabs = [
  { label: "数据总览", to: "/admin/monitoring" },
  { label: "数据异常", to: "/admin/monitoring/anomalies" },
  { label: "修复任务", to: "/admin/monitoring/repair-tasks" },
  { label: "监控规则", to: "/admin/monitoring/rules" },
  { label: "运行记录", to: "/admin/monitoring/runs" },
];

export default function MonitoringSubnav() {
  const { tText } = useAdminT();
  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="flex w-max min-w-full gap-2 px-1 sm:flex-wrap sm:w-auto">
        {tabs.map((tab) => (
          <NavLink
            key={tab.to}
            to={tab.to}
            end={tab.to === "/admin/monitoring"}
            className={({ isActive }) =>
              `touch-manipulation shrink-0 px-3 py-2 text-sm ${
                isActive
                  ? "rounded-lg bg-foreground font-semibold text-background shadow-sm"
                  : monitoringSecondaryButtonClass
              }`
            }
          >
            {tab.label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}

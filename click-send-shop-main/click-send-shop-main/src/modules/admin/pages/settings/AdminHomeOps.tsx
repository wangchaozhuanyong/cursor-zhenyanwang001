import { useState } from "react";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint, { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { Grid3X3, LayoutGrid, Sparkles, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminHomeOpsDisplayPanel from "./homeOps/AdminHomeOpsDisplayPanel";
import AdminHomeOpsModulePanel from "./homeOps/AdminHomeOpsModulePanel";
import AdminHomeOpsNewArrivalPanel from "./homeOps/AdminHomeOpsNewArrivalPanel";
import AdminHomeNavEditor from "./homeOps/AdminHomeNavEditor";
import { useAdminT } from "@/hooks/useAdminT";

type HomeOpsTab = "modules" | "display" | "nav" | "newArrival";

const HOME_OPS_TABS: { id: HomeOpsTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "modules", label: "模块开关", icon: ToggleLeft, desc: "管理首页模块的启用、禁用和顺序" },
  { id: "display", label: "展示设置", icon: LayoutGrid, desc: "设置首页展示规则与数量" },
  { id: "nav", label: "金刚区导航", icon: Grid3X3, desc: "维护图标、标题、跳转方式和排序" },
  { id: "newArrival", label: "新品主推设置", icon: Sparkles, desc: "配置新品专区的展示内容" },
];

export default function AdminHomeOps() {
  const { tText } = useAdminT();
  const [activeTab, setActiveTab] = useState<HomeOpsTab>("modules");

  return (
    <div className="space-y-6">
      <div>
        <AdminPageTitle
          title={<Tx>首页运营</Tx>}
          hint={<Tx>统一管理模块开关、展示设置、金刚区导航和新品主推设置。</Tx>}
        />
      </div>
      <div className="space-y-4">
        <nav
          className="flex flex-wrap gap-2 border-b border-border pb-3"
          aria-label={tText("首页运营分区")}
        >
          {HOME_OPS_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "border-gold/40 bg-gold/10 text-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-gold/25 hover:bg-secondary/50",
                )}
              >
                <Icon size={16} className={active ? "text-theme-price" : ""} />
                {tab.label}
                <AdminFieldHint text={tab.desc} />
              </button>
            );
          })}
        </nav>
        <div className="min-w-0">
          {activeTab === "modules" ? <AdminHomeOpsModulePanel /> : null}
          {activeTab === "display" ? <AdminHomeOpsDisplayPanel /> : null}
          {activeTab === "newArrival" ? <AdminHomeOpsNewArrivalPanel /> : null}
          {activeTab === "nav" ? <AdminHomeNavEditor /> : null}
        </div>
      </div>
    </div>
  );
}

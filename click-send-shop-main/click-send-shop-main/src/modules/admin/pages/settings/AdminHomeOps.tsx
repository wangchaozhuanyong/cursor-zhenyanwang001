import { useState } from "react";
import { Tx } from "@/components/admin/AdminText";
import AdminFieldHint from "@/components/admin/AdminFieldHint";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Grid3X3, LayoutGrid, Sparkles, ToggleLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import AdminHomeOpsDisplayPanel from "./homeOps/AdminHomeOpsDisplayPanel";
import AdminHomeOpsModulePanel from "./homeOps/AdminHomeOpsModulePanel";
import AdminHomeOpsNewArrivalPanel from "./homeOps/AdminHomeOpsNewArrivalPanel";
import AdminHomeNavEditor from "./homeOps/AdminHomeNavEditor";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type HomeOpsTab = "modules" | "display" | "nav" | "newArrival";

const HOME_OPS_TABS: { id: HomeOpsTab; label: string; icon: React.ElementType; desc: string }[] = [
  { id: "modules", label: "模块开关", icon: ToggleLeft, desc: "管理首页模块的启用和禁用" },
  { id: "display", label: "展示设置", icon: LayoutGrid, desc: "设置首页展示规则与数量" },
  { id: "nav", label: "快捷入口", icon: Grid3X3, desc: "维护图标、标题、跳转方式和排序" },
  { id: "newArrival", label: "新品主推设置", icon: Sparkles, desc: "配置新品专区的展示内容" },
];

export default function AdminHomeOps() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const [activeTab, setActiveTab] = useState<HomeOpsTab>("modules");
  const [panelDirty, setPanelDirty] = useState(false);
  useAdminTabDirty(panelDirty);

  const requestTabChange = (nextTab: HomeOpsTab) => {
    if (nextTab === activeTab) return;
    if (panelDirty) {
      confirm({
        title: tText("未保存的修改"),
        description: tText("当前分区还有未保存内容，切换后将丢失这些修改。"),
        confirmText: tText("继续切换"),
        onConfirm: () => setActiveTab(nextTab),
      });
      return;
    }
    setActiveTab(nextTab);
  };

  return (
    <AdminPageShell hint={<Tx>统一管理模块开关、展示设置、快捷入口和新品主推设置。</Tx>}>
      <div className="space-y-4">
        <nav
          className="flex flex-wrap gap-2 border-b border-border pb-3"
          aria-label={tText("首页运营分区")}
        >
          {HOME_OPS_TABS.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.id;
            return (
              <UnifiedButton
                key={tab.id}
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => requestTabChange(tab.id)}
                className={cn(
                  "inline-flex shrink-0 items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition-colors",
                  active
                    ? "border-[color-mix(in_srgb,var(--theme-price)_40%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] text-foreground shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-[color-mix(in_srgb,var(--theme-primary)_25%,var(--theme-border))] hover:bg-secondary/50",
                )}
              >
                <Icon size={16} className={active ? "text-theme-price" : ""} />
                {tab.label}
                <AdminFieldHint text={tab.desc} />
              </UnifiedButton>
            );
          })}
        </nav>
        <div className="min-w-0">
          {activeTab === "modules" ? <AdminHomeOpsModulePanel onDirtyChange={setPanelDirty} /> : null}
          {activeTab === "display" ? <AdminHomeOpsDisplayPanel onDirtyChange={setPanelDirty} /> : null}
          {activeTab === "newArrival" ? <AdminHomeOpsNewArrivalPanel onDirtyChange={setPanelDirty} /> : null}
          {activeTab === "nav" ? <AdminHomeNavEditor onDirtyChange={setPanelDirty} /> : null}
        </div>
      </div>
    </AdminPageShell>
  );
}

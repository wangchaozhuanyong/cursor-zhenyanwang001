import { useMemo, useState } from "react";
import { Tx } from "@/components/admin/AdminText";
import AdminPointsRecords from "@/modules/admin/pages/user/AdminPointsRecords";

export default function AdminMarketingPoints() {
  const tabs = useMemo(() => ["积分规则", "积分明细", "手动调整"], []);
  const [tab, setTab] = useState(tabs[1]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground"><Tx>活动管理 / 积分管理</Tx></h1>
      <div className="flex gap-2">
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-gold/15 text-theme-price" : "bg-secondary text-muted-foreground"}`}>{t}</button>)}
      </div>
      {tab === "积分规则" ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"><Tx>积分规则维护请在本页规则区编辑；此处预留独立规则配置面板。</Tx></div> : null}
      {tab === "积分明细" ? <AdminPointsRecords /> : null}
      {tab === "手动调整" ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"><Tx>手动调整入口已预留，后续将接入用户选择、增减值、原因与审计链路。</Tx></div> : null}
    </div>
  );
}

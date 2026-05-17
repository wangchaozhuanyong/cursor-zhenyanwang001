import { useMemo, useState } from "react";
import { Tx } from "@/components/admin/AdminText";
import AdminRewardRecords from "@/modules/admin/pages/user/AdminRewardRecords";

export default function AdminMarketingRewards() {
  const tabs = useMemo(() => ["返现规则", "返现记录", "提现/结算"], []);
  const [tab, setTab] = useState(tabs[1]);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-foreground"><Tx>活动管理 / 返现管理</Tx></h1>
      <div className="flex gap-2">
        {tabs.map((t) => <button key={t} onClick={() => setTab(t)} className={`rounded-lg px-3 py-1.5 text-sm ${tab === t ? "bg-gold/15 text-theme-price" : "bg-secondary text-muted-foreground"}`}>{t}</button>)}
      </div>
      {tab === "返现规则" ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"><Tx>返现规则配置区预留（邀请返现/订单返现/层级返现）。</Tx></div> : null}
      {tab === "返现记录" ? <AdminRewardRecords /> : null}
      {tab === "提现/结算" ? <div className="rounded-xl border border-border bg-card p-4 text-sm text-muted-foreground"><Tx>提现/结算能力预留。</Tx></div> : null}
    </div>
  );
}

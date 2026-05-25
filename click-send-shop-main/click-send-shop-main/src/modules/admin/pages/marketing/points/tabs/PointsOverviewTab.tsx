import AdminFieldHint from "@/components/admin/AdminFieldHint";
import { Tx } from "@/components/admin/AdminText";
import { POINTS_OVERVIEW_STAT_HINTS } from "@/modules/admin/pages/marketing/adminPointsHints";
import type { PointsStats } from "@/types/points";

export default function PointsOverviewTab({ stats }: { stats: PointsStats }) {
  const cards: [string, number][] = [
    ["累计发放积分", stats.totalEarned],
    ["累计使用/回滚积分", stats.totalDeducted],
    ["积分流水数", stats.totalRecords],
    ["积分活跃用户", stats.activeUsers],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-4">
      {cards.map(([k, v]) => (
        <div key={k} className="rounded-xl border border-border bg-card p-4">
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tx>{k}</Tx>
            {POINTS_OVERVIEW_STAT_HINTS[k] ? <AdminFieldHint text={POINTS_OVERVIEW_STAT_HINTS[k]} /> : null}
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{String(v)}</p>
        </div>
      ))}
    </div>
  );
}

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMonitoringOverview, type MonitoringOverview } from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { Badge, formatTime, severityClass } from "./monitoringUi";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useMonitoringLabel } from "@/hooks/useMonitoringLabel";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";

export default function AdminMonitoringOverview() {
  const { tText } = useAdminT();
  const ml = useMonitoringLabel();
  const [data, setData] = useState<MonitoringOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonitoringOverview()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const metrics = useMemo(
    () => [
      [tText("今日检测次数"), data?.todayRunCount ?? 0],
      [tText("今日异常数"), data?.todayAnomalyCount ?? 0],
      [tText("当前待处理异常"), data?.openAnomalyCount ?? 0],
      [tText("P0/P1 高危异常"), data?.highRiskCount ?? 0],
      [tText("已修复异常"), data?.fixedCount ?? 0],
    ],
    [tText, data],
  );

  return (
    <AdminPageShell
      hint={<Tx>汇总今日检测、异常与高危项，并可跳转规则、运行记录与修复任务。</Tx>}
      filters={<MonitoringSubnav />}
    >
      {loading ? <div className="text-sm text-slate-500"><Tx>加载中...</Tx></div> : (
        <div className="space-y-5">
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-base font-semibold text-slate-900"><Tx>模块异常排行</Tx></h2>
              <div className="space-y-2">
                {(data?.moduleCounts || []).map((item) => (
                  <div key={item.module} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                    <span>{ml.module(item.module)}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
                {!data?.moduleCounts?.length && <div className="text-sm text-slate-500"><Tx>暂无异常</Tx></div>}
              </div>
            </section>

            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-base font-semibold text-slate-900"><Tx>最近运行记录</Tx></h2>
              <div className="space-y-2">
                {(data?.recentRuns || []).map((run) => (
                  <div key={run.id} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate" title={run.rule_code || run.run_type || undefined}>
                      {run.rule_code
                        ? ml.rule(run.rule_code)
                        : ml.runType(run.run_type)}
                    </span>
                    <span className="text-slate-500">{run.checked_count}/{run.anomaly_count}</span>
                    <Badge value={run.status} />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-base font-semibold text-slate-900"><Tx>最近高危异常</Tx></h2>
            <AdminNativeTable stickyFirstColumn={false}>
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Tx>等级</Tx></th>
                    <th className={adminThClassName(undefined, "left")}><Tx>异常</Tx></th>
                    <th className={adminThClassName(undefined, "left")}><Tx>对象</Tx></th>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>最近发现</Tx></th>
                    <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}><Tx>操作</Tx></th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.recentHighRisk || []).map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={item.severity} tone={severityClass[item.severity]} /></td>
                      <td className={adminTdClassName("font-medium text-slate-900", "left")}>{item.title}</td>
                      <td className={adminTdClassName("text-slate-600", "left")}>{ml.entityRef(item.entity_type, item.entity_id)}</td>
                      <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-slate-600`, "left")}>{formatTime(item.last_seen_at)}</td>
                      <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}><Link className="text-blue-600" to={`/admin/monitoring/anomalies/${item.id}`}><Tx>查看</Tx></Link></td>
                    </tr>
                  ))}
                </tbody>
            </AdminNativeTable>
          </section>
        </div>
      )}
    </AdminPageShell>
  );
}

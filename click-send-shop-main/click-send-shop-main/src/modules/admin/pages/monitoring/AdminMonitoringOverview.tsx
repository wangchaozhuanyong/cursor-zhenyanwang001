import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getMonitoringOverview, type MonitoringOverview } from "@/api/admin/monitoring";
import MonitoringSubnav, { Badge, formatTime, severityClass } from "./MonitoringSubnav";

export default function AdminMonitoringOverview() {
  const [data, setData] = useState<MonitoringOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getMonitoringOverview()
      .then((res) => setData(res.data))
      .finally(() => setLoading(false));
  }, []);

  const metrics = [
    ["今日检测次数", data?.todayRunCount ?? 0],
    ["今日异常数", data?.todayAnomalyCount ?? 0],
    ["当前待处理异常", data?.openAnomalyCount ?? 0],
    ["P0/P1 高危异常", data?.highRiskCount ?? 0],
    ["已修复异常", data?.fixedCount ?? 0],
  ];

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">数据一致性监控中心</h1>
      <MonitoringSubnav />
      {loading ? <div className="text-sm text-slate-500">加载中...</div> : (
        <div className="space-y-5">
          <div className="grid gap-3 md:grid-cols-5">
            {metrics.map(([label, value]) => (
              <div key={label} className="rounded border border-slate-200 bg-white p-4">
                <div className="text-sm text-slate-500">{label}</div>
                <div className="mt-2 text-2xl font-bold text-slate-900">{value}</div>
              </div>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-base font-semibold text-slate-900">模块异常排行</h2>
              <div className="space-y-2">
                {(data?.moduleCounts || []).map((item) => (
                  <div key={item.module} className="flex items-center justify-between rounded bg-slate-50 px-3 py-2 text-sm">
                    <span>{item.module}</span>
                    <strong>{item.count}</strong>
                  </div>
                ))}
                {!data?.moduleCounts?.length && <div className="text-sm text-slate-500">暂无异常</div>}
              </div>
            </section>

            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-3 text-base font-semibold text-slate-900">最近运行记录</h2>
              <div className="space-y-2">
                {(data?.recentRuns || []).map((run) => (
                  <div key={run.id} className="flex items-center justify-between gap-3 rounded bg-slate-50 px-3 py-2 text-sm">
                    <span className="truncate">{run.rule_code || run.run_type}</span>
                    <span className="text-slate-500">{run.checked_count}/{run.anomaly_count}</span>
                    <Badge value={run.status} />
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 text-base font-semibold text-slate-900">最近高危异常</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr><th className="p-3">等级</th><th className="p-3">异常</th><th className="p-3">对象</th><th className="p-3">最近发现</th><th className="p-3">操作</th></tr>
                </thead>
                <tbody>
                  {(data?.recentHighRisk || []).map((item) => (
                    <tr key={item.id} className="border-t">
                      <td className="p-3"><Badge value={item.severity} tone={severityClass[item.severity]} /></td>
                      <td className="p-3 font-medium text-slate-900">{item.title}</td>
                      <td className="p-3 text-slate-600">{item.entity_type}:{item.entity_id}</td>
                      <td className="p-3 text-slate-600">{formatTime(item.last_seen_at)}</td>
                      <td className="p-3"><Link className="text-blue-600" to={`/admin/monitoring/anomalies/${item.id}`}>查看</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

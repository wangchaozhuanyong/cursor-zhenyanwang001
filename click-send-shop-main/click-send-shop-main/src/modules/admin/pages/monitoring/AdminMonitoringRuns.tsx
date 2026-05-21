import { useEffect, useState } from "react";
import { getMonitoringRuns, type MonitoringRun } from "@/api/admin/monitoring";
import MonitoringSubnav, { Badge, formatTime } from "./MonitoringSubnav";

export default function AdminMonitoringRuns() {
  const [runs, setRuns] = useState<MonitoringRun[]>([]);
  const [status, setStatus] = useState("");

  useEffect(() => {
    getMonitoringRuns({ pageSize: 50, status }).then((res) => setRuns(res.data.list));
  }, [status]);

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">运行记录</h1>
      <MonitoringSubnav />
      <div className="mb-4 rounded border border-slate-200 bg-white p-3">
        <select className="rounded border px-3 py-2 text-sm" value={status} onChange={(e) => setStatus(e.target.value)}>
          {["", "running", "success", "failed", "cancelled"].map((s) => <option key={s} value={s}>{s || "全部状态"}</option>)}
        </select>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3">运行类型</th><th className="p-3">规则</th><th className="p-3">状态</th><th className="p-3">检查数量</th><th className="p-3">异常数量</th><th className="p-3">开始时间</th><th className="p-3">结束时间</th><th className="p-3">耗时</th><th className="p-3">错误信息</th></tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t">
                <td className="p-3">{run.run_type}</td>
                <td className="p-3 font-mono text-xs">{run.rule_code || "-"}</td>
                <td className="p-3"><Badge value={run.status} /></td>
                <td className="p-3">{run.checked_count}</td>
                <td className="p-3">{run.anomaly_count}</td>
                <td className="p-3">{formatTime(run.started_at)}</td>
                <td className="p-3">{formatTime(run.finished_at)}</td>
                <td className="p-3">{run.duration_ms ? `${Math.round(run.duration_ms)} ms` : "-"}</td>
                <td className="p-3 text-red-600">{run.error_message || "-"}</td>
              </tr>
            ))}
            {!runs.length && <tr><td className="p-6 text-center text-slate-500" colSpan={9}>暂无运行记录</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

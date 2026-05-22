import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  createRepairTask,
  getMonitoringAnomalies,
  ignoreMonitoringAnomaly,
  rescanMonitoringAnomaly,
  resolveMonitoringAnomaly,
  type MonitoringAnomaly,
} from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import { Badge, formatTime, severityClass } from "./monitoringUi";
import {
  formatMonitoringEntityRef,
  formatMonitoringModuleLabel,
  formatMonitoringRootCause,
  MONITORING_ANOMALY_STATUS_LABELS,
} from "./monitoringLabels";

const statuses = ["", "open", "investigating", "repair_pending", "repaired", "resolved", "ignored"];
const severities = ["", "P0", "P1", "P2", "P3", "INFO"];

export default function AdminMonitoringAnomalies() {
  const [list, setList] = useState<MonitoringAnomaly[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [severity, setSeverity] = useState("");
  const [keyword, setKeyword] = useState("");
  const [loading, setLoading] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    getMonitoringAnomalies({ page, pageSize: 20, status, severity, keyword })
      .then((res) => {
        setList(res.data.list);
        setTotal(res.data.total);
      })
      .finally(() => setLoading(false));
  }, [keyword, page, severity, status]);

  useEffect(() => {
    load();
  }, [load]);

  async function action(fn: () => Promise<unknown>) {
    await fn();
    load();
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">数据异常</h1>
      <MonitoringSubnav />
      <div className="mb-4 flex flex-wrap gap-2 rounded border border-slate-200 bg-white p-3">
        <select className="rounded border px-3 py-2 text-sm" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          {statuses.map((s) => (
            <option key={s} value={s}>{s ? MONITORING_ANOMALY_STATUS_LABELS[s] || s : "全部状态"}</option>
          ))}
        </select>
        <select className="rounded border px-3 py-2 text-sm" value={severity} onChange={(e) => { setPage(1); setSeverity(e.target.value); }}>
          {severities.map((s) => <option key={s} value={s}>{s || "全部等级"}</option>)}
        </select>
        <input className="min-w-56 rounded border px-3 py-2 text-sm" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="关键词 / 对象 / 原因" />
        <button className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => { setPage(1); load(); }}>筛选</button>
      </div>
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3 w-16">等级</th><th className="p-3 w-20">模块</th><th className="p-3">异常标题</th><th className="p-3">关联对象</th><th className="p-3">可能原因</th><th className="p-3 whitespace-nowrap">首次发现</th><th className="p-3 whitespace-nowrap">最近发现</th><th className="p-3 w-24">状态</th><th className="p-3">操作</th></tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.id} className="border-t align-top">
                <td className="whitespace-nowrap p-3"><Badge value={item.severity} tone={severityClass[item.severity]} /></td>
                <td className="whitespace-nowrap p-3 text-slate-900">{formatMonitoringModuleLabel(item.module)}</td>
                <td className="p-3 font-medium text-slate-900">{item.title}</td>
                <td className="p-3 text-slate-600" title={`${item.entity_type}:${item.entity_id}`}>
                  {formatMonitoringEntityRef(item.entity_type, item.entity_id)}
                </td>
                <td className="p-3 text-slate-600">
                  {formatMonitoringRootCause(item.root_cause_message, item.root_cause_code)}
                </td>
                <td className="whitespace-nowrap p-3 text-slate-600">{formatTime(item.first_seen_at)}</td>
                <td className="whitespace-nowrap p-3 text-slate-600">{formatTime(item.last_seen_at)}</td>
                <td className="whitespace-nowrap p-3"><Badge value={item.status} /></td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Link className="text-blue-600" to={`/admin/monitoring/anomalies/${item.id}`}>详情</Link>
                    <button className="text-blue-600" onClick={() => action(() => rescanMonitoringAnomaly(item.id))}>复查</button>
                    <button className="text-blue-600" onClick={() => action(() => createRepairTask(item.id))}>建任务</button>
                    <button className="text-slate-600" onClick={() => action(() => ignoreMonitoringAnomaly(item.id))}>忽略</button>
                    <button className="text-emerald-600" onClick={() => action(() => resolveMonitoringAnomaly(item.id))}>解决</button>
                  </div>
                </td>
              </tr>
            ))}
            {!list.length && <tr><td className="p-6 text-center text-slate-500" colSpan={9}>{loading ? "加载中..." : "暂无异常"}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>共 {total} 条</span>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>上一页</button>
          <span className="px-2 py-1">{page}</span>
          <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}>下一页</button>
        </div>
      </div>
    </div>
  );
}

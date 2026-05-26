import { useCallback, useEffect, useState } from "react";
import { getMonitoringAnomalies, type MonitoringAnomaly } from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import MonitoringAnomalyRowActions from "./MonitoringAnomalyRowActions";
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
import { MONITORING_ANOMALY_STATUS_LABELS } from "./monitoringLabels";

const statuses = ["", "open", "investigating", "repair_pending", "repaired", "resolved", "ignored"];
const severities = ["", "P0", "P1", "P2", "P3", "INFO"];

export default function AdminMonitoringAnomalies() {
  const { tText } = useAdminT();
  const ml = useMonitoringLabel();
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
    <AdminPageShell
      hint={<Tx>按状态、等级与关键词筛选数据一致性异常，可进入详情处理。</Tx>}
      filters={(
        <>
          <MonitoringSubnav />
          <div className="flex flex-wrap gap-2 rounded border border-slate-200 bg-white p-3">
            <select className="rounded border px-3 py-2 text-sm" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
              {statuses.map((s) => (
                <option key={s} value={s}>{s ? tText(MONITORING_ANOMALY_STATUS_LABELS[s] || s) : tText("全部状态")}</option>
              ))}
            </select>
            <select className="rounded border px-3 py-2 text-sm" value={severity} onChange={(e) => { setPage(1); setSeverity(e.target.value); }}>
              {severities.map((s) => (
                <option key={s} value={s}>
                  {s ? ml.severity(s) || s : tText("全部等级")}
                </option>
              ))}
            </select>
            <input className="min-w-56 rounded border px-3 py-2 text-sm" value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder={tText("关键词 / 对象 / 原因")} />
            <button className="rounded bg-slate-900 px-4 py-2 text-sm font-semibold text-white" onClick={() => { setPage(1); load(); }}><Tx>筛选</Tx></button>
          </div>
        </>
      )}
    >
      <AdminNativeTable>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>等级</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>模块</Tx></th>
              <th className={adminThClassName()}><Tx>异常标题</Tx></th>
              <th className={adminThClassName()}><Tx>关联对象</Tx></th>
              <th className={adminThClassName()}><Tx>可能原因</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>首次发现</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>最近发现</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>状态</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>操作</Tx></th>
            </tr>
          </thead>
          <tbody>
            {list.map((item) => (
              <tr key={item.id} className="border-t align-middle">
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Badge value={item.severity} tone={severityClass[item.severity]} /></td>
                <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-slate-900`)}>{ml.module(item.module)}</td>
                <td className={adminTdClassName("font-medium text-slate-900")}>{item.title}</td>
                <td className={adminTdClassName("text-slate-600")} title={`${item.entity_type}:${item.entity_id}`}>
                  {ml.entityRef(item.entity_type, item.entity_id)}
                </td>
                <td className={adminTdClassName("text-slate-600")}>
                  {ml.rootCause(item.root_cause_message, item.root_cause_code)}
                </td>
                <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-slate-600`)}>{formatTime(item.first_seen_at)}</td>
                <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-slate-600`)}>{formatTime(item.last_seen_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Badge value={item.status} /></td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                  <MonitoringAnomalyRowActions item={item} onAction={action} />
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td className={adminTdClassName("py-6 text-center text-slate-500")} colSpan={9}>
                  {loading ? "加载中..." : "暂无异常"}
                </td>
              </tr>
            )}
          </tbody>
      </AdminNativeTable>
      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>共 {total} 条</span>
        <div className="flex gap-2">
          <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Tx>上一页</Tx></button>
          <span className="px-2 py-1">{page}</span>
          <button className="rounded border px-3 py-1 disabled:opacity-40" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}><Tx>下一页</Tx></button>
        </div>
      </div>
    </AdminPageShell>
  );
}

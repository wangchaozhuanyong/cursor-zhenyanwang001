import { useCallback, useEffect, useState } from "react";
import { executeRepairTask, getRepairTasks, type MonitoringRepairTask } from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { Badge, formatTime, JsonBlock } from "./monitoringUi";
import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import { useMonitoringLabel } from "@/hooks/useMonitoringLabel";

const statuses = ["", "pending", "approved", "executed", "failed", "cancelled"];

export default function AdminMonitoringRepairTasks() {
  const { tText } = useAdminT();
  const ml = useMonitoringLabel();
  const [list, setList] = useState<MonitoringRepairTask[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [executingId, setExecutingId] = useState<number | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    return getRepairTasks({ page, pageSize: 20, status: status || undefined })
      .then((res) => {
        setList(res.data.list);
        setTotal(res.data.total);
      })
      .catch((err: unknown) => {
        setList([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : "加载修复任务失败");
      })
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleExecute(taskId: number) {
    setActionError(null);
    setExecutingId(taskId);
    try {
      await executeRepairTask(taskId);
      await load();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "执行修复任务失败");
    } finally {
      setExecutingId(null);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-900 sm:text-2xl"><Tx>修复任务</Tx></h1>
      <MonitoringSubnav />
      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {actionError ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div> : null}
      <div className="rounded-xl border border-slate-200 bg-white p-3">
        <select
          className="w-full rounded border px-3 py-2.5 text-sm sm:w-auto"
          value={status}
          onChange={(e) => { setPage(1); setStatus(e.target.value); }}
        >
          {statuses.map((s) => (
            <option key={s} value={s}>{s ? ml.status(s) || s : tText("全部状态")}</option>
          ))}
        </select>
      </div>
      <AdminNativeTable>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>状态</Tx></th>
              <th className={adminThClassName()}><Tx>异常标题</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>修复类型</Tx></th>
              <th className={adminThClassName()}><Tx>修复建议</Tx></th>
              <th className={adminThClassName()}><Tx>操作人</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>创建时间</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>执行时间</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Tx>操作</Tx></th>
            </tr>
          </thead>
          <tbody>
            {list.map((task) => (
              <tr key={task.id} className="border-t align-top">
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}><Badge value={task.repair_status} /></td>
                <td className={adminTdClassName("font-medium text-slate-900")}>{task.anomaly_title || task.anomaly_id}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{task.repair_type}</td>
                <td className={adminTdClassName("max-w-md")}><JsonBlock data={task.suggestion} /></td>
                <td className={adminTdClassName()}>{task.operator_label || task.operator_id || "-"}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{formatTime(task.created_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{formatTime(task.executed_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                  <button
                    type="button"
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    disabled={task.repair_status === "executed" || executingId === task.id}
                    onClick={() => void handleExecute(task.id)}
                  >
                    {executingId === task.id ? "执行中..." : "执行"}
                  </button>
                </td>
              </tr>
            ))}
            {!list.length && (
              <tr>
                <td className={adminTdClassName("py-6 text-center text-slate-500")} colSpan={8}>
                  {loading ? "加载中..." : "暂无修复任务"}
                </td>
              </tr>
            )}
          </tbody>
      </AdminNativeTable>
      <div className="flex flex-col gap-2 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
        <span>共 {total} 条</span>
        <div className="flex gap-2">
          <button type="button" className="rounded border px-3 py-1 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Tx>上一页</Tx></button>
          <span className="px-2 py-1">{page}</span>
          <button type="button" className="rounded border px-3 py-1 disabled:opacity-40" disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}><Tx>下一页</Tx></button>
        </div>
      </div>
    </div>
  );
}

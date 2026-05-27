import { useCallback, useEffect, useState } from "react";
import { executeRepairTask, getRepairTasks, type MonitoringRepairTask } from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { Badge, formatTime } from "./monitoringUi";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  ADMIN_TABLE_WRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import { useMonitoringLabel } from "@/hooks/useMonitoringLabel";

const statuses = ["", "pending", "approved", "executed", "failed", "cancelled"];
const executableRepairTypes = new Set([
  "sync_product_stock_from_variants",
  "clear_cache_key",
  "recalculate_user_statistics",
]);

function canExecuteTask(task: MonitoringRepairTask) {
  return ["pending", "approved"].includes(task.repair_status)
    && executableRepairTypes.has(task.repair_type);
}

function executeButtonLabel(task: MonitoringRepairTask, executing: boolean) {
  if (executing) return "执行中...";
  if (task.repair_status === "executed") return "已执行";
  if (!executableRepairTypes.has(task.repair_type)) return "需人工处理";
  if (!["pending", "approved"].includes(task.repair_status)) return "不可执行";
  return "执行";
}

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
    <AdminPageShell
      hint={<Tx>由异常或规则生成的修复任务，支持部分类型一键执行。</Tx>}
      filters={(
        <>
          <MonitoringSubnav />
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
        </>
      )}
    >
      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {actionError ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div> : null}
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
                <td className={adminTdClassName("font-medium text-slate-900")}>{task.anomaly_title || tText("未命名异常")}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                  {ml.repairType(task.repair_type)}
                </td>
                <td className={adminTdClassName(`${ADMIN_TABLE_WRAP_CLASS} max-w-[18rem] align-top`)}>
                  <AdminTableCell
                    value={ml.repairSuggestion(task.suggestion, task.repair_type)}
                    fullText={ml.repairSuggestionDetail(task.suggestion, task.repair_type)}
                    maxWidth="17rem"
                  />
                </td>
                <td className={adminTdClassName()}>{task.operator_label || (task.operator_id ? tText("管理员") : "-")}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{formatTime(task.created_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>{formatTime(task.executed_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS)}>
                  <button
                    type="button"
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                    disabled={!canExecuteTask(task) || executingId === task.id}
                    onClick={() => void handleExecute(task.id)}
                    title={!canExecuteTask(task) ? "此类任务需要人工确认处理，不能自动执行" : undefined}
                  >
                    {executeButtonLabel(task, executingId === task.id)}
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
    </AdminPageShell>
  );
}

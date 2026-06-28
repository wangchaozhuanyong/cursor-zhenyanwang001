import { useCallback, useEffect, useState } from "react";
import { executeRepairTask, getRepairTasks, type MonitoringRepairTask } from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import AdminNativeTable, {
  AdminNativeTableSkeletonRows,
  AdminNativeTableStateRow,
} from "@/components/admin/AdminNativeTable";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import {
  Badge,
  formatTime,
  monitoringInputClass,
  monitoringMutedClass,
  monitoringPanelClass,
  monitoringPrimaryButtonClass,
  monitoringSecondaryButtonClass,
  monitoringTableHeadClass,
} from "./monitoringUi";
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
import { UnifiedButton } from "@/components/ui/UnifiedButton";

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
          <div className={monitoringPanelClass}>
            <select
              className={`${monitoringInputClass} w-full sm:w-auto`}
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
      {actionError ? <div role="alert" className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div> : null}
      <AdminNativeTable>
          <thead className={monitoringTableHeadClass}>
            <tr>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Tx>状态</Tx></th>
              <th className={adminThClassName(undefined, "left")}><Tx>异常标题</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>修复类型</Tx></th>
              <th className={adminThClassName(undefined, "left")}><Tx>修复建议</Tx></th>
              <th className={adminThClassName(undefined, "left")}><Tx>操作人</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>创建时间</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>执行时间</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}><Tx>操作</Tx></th>
            </tr>
          </thead>
          <tbody>
            {loading && !list.length ? (
              <AdminNativeTableSkeletonRows columns={8} rows={5} label={tText("修复任务加载中")} />
            ) : null}
            {list.map((task) => (
              <tr key={task.id} className="border-t align-top">
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={task.repair_status} /></td>
                <td className={adminTdClassName("font-medium text-foreground", "left")}>{task.anomaly_title || tText("未命名异常")}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>
                  {ml.repairType(task.repair_type)}
                </td>
                <td className={adminTdClassName(`${ADMIN_TABLE_WRAP_CLASS} max-w-[18rem] align-top`, "left")}>
                  <AdminTableCell
                    value={ml.repairSuggestion(task.suggestion, task.repair_type)}
                    fullText={ml.repairSuggestionDetail(task.suggestion, task.repair_type)}
                    maxWidth="17rem"
                  />
                </td>
                <td className={adminTdClassName(undefined, "left")}>{task.operator_label || (task.operator_id ? tText("管理员") : "-")}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{formatTime(task.created_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{formatTime(task.executed_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                  <UnifiedButton
                    type="button"
                    className={monitoringPrimaryButtonClass}
                    disabled={!canExecuteTask(task) || executingId === task.id}
                    onClick={() => void handleExecute(task.id)}
                    title={!canExecuteTask(task) ? "此类任务需要人工确认处理，不能自动执行" : undefined}
                  >
                    {executeButtonLabel(task, executingId === task.id)}
                  </UnifiedButton>
                </td>
              </tr>
            ))}
            {!loading && error && !list.length ? (
              <AdminNativeTableStateRow
                colSpan={8}
                type="error"
                title={tText("修复任务加载失败")}
                description={error}
                actionLabel={tText("重试")}
                onAction={() => void load()}
              />
            ) : null}
            {!loading && !error && !list.length ? (
              <AdminNativeTableStateRow
                colSpan={8}
                title={tText("暂无修复任务")}
                description={tText("当前筛选条件下没有待处理的修复任务。")}
              />
            ) : null}
          </tbody>
      </AdminNativeTable>
      <div className={`flex flex-col gap-2 text-sm ${monitoringMutedClass} sm:flex-row sm:items-center sm:justify-between`}>
        <span>共 {total} 条</span>
        <div className="flex gap-2">
          <UnifiedButton type="button" className={monitoringSecondaryButtonClass} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><Tx>上一页</Tx></UnifiedButton>
          <span className="px-2 py-1">{page}</span>
          <UnifiedButton type="button" className={monitoringSecondaryButtonClass} disabled={page * 20 >= total} onClick={() => setPage((p) => p + 1)}><Tx>下一页</Tx></UnifiedButton>
        </div>
      </div>
    </AdminPageShell>
  );
}

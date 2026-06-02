import { useCallback, useEffect, useState } from "react";
import { getMonitoringRuns, type MonitoringRun } from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import {
  Badge,
  formatTime,
  monitoringInputClass,
  monitoringMutedClass,
  monitoringPanelClass,
  monitoringSecondaryButtonClass,
  monitoringTableHeadClass,
} from "./monitoringUi";
import { MONITORING_RUN_STATUS_LABELS } from "./monitoringLabels";
import { formatSystemErrorMessage } from "@/utils/systemErrorMessage";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";
import { useMonitoringLabel } from "@/hooks/useMonitoringLabel";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export default function AdminMonitoringRuns() {
  const { tText } = useAdminT();
  const ml = useMonitoringLabel();
  const [runs, setRuns] = useState<MonitoringRun[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    return getMonitoringRuns({ page, pageSize: 20, status: status || undefined })
      .then((res) => {
        setRuns(res.data.list);
        setTotal(res.data.total);
      })
      .catch((err: unknown) => {
        setRuns([]);
        setTotal(0);
        setError(err instanceof Error ? err.message : "加载运行记录失败");
      })
      .finally(() => setLoading(false));
  }, [page, status]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <AdminPageShell
      hint={<Tx>查看规则与手动触发的每次检测运行结果。</Tx>}
      filters={(
        <>
          <MonitoringSubnav />
          <div className={monitoringPanelClass}>
            <select
              className={`${monitoringInputClass} w-full sm:w-auto`}
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
            >
              {["", "running", "success", "failed", "cancelled"].map((s) => (
                <option key={s} value={s}>{s ? ml.status(s) || s : tText("全部状态")}</option>
              ))}
            </select>
          </div>
        </>
      )}
    >
      {error ? <div className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      <AdminNativeTable>
          <thead className={monitoringTableHeadClass}>
            <tr>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>运行类型</Tx></th>
              <th className={adminThClassName(undefined, "left")}><Tx>规则</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Tx>状态</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}><Tx>检查数量</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}><Tx>异常数量</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>开始时间</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>结束时间</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}><Tx>耗时</Tx></th>
              <th className={adminThClassName(undefined, "left")}><Tx>错误信息</Tx></th>
            </tr>
          </thead>
          <tbody>
            {runs.map((run) => (
              <tr key={run.id} className="border-t">
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{ml.runType(run.run_type)}</td>
                <td className={adminTdClassName("text-foreground", "left")}>{run.rule_code ? ml.rule(run.rule_code) : "-"}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Badge value={run.status} /></td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{run.checked_count}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{run.anomaly_count}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{formatTime(run.started_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}>{formatTime(run.finished_at)}</td>
                <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>{run.duration_ms ? `${Math.round(run.duration_ms)} ms` : "-"}</td>
                <td className={adminTdClassName("text-red-600", "left")} title={run.error_message || ""}>
                  {formatSystemErrorMessage(run.error_message)}
                </td>
              </tr>
            ))}
            {!runs.length && (
              <tr>
                <td className={adminTdClassName(`py-6 text-center ${monitoringMutedClass}`, "center")} colSpan={9}>
                  {loading ? "加载中..." : "暂无运行记录"}
                </td>
              </tr>
            )}
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

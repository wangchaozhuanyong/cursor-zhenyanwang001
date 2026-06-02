import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  createRepairTask,
  getMonitoringAnomalyDetail,
  ignoreMonitoringAnomaly,
  rescanMonitoringAnomaly,
  resolveMonitoringAnomaly,
  type MonitoringAnomalyDetail,
} from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import {
  Badge,
  formatTime,
  JsonBlock,
  monitoringActionLinkClass,
  monitoringHeadingClass,
  monitoringMutedClass,
  monitoringPanelClass,
  monitoringPrimaryButtonClass,
  monitoringSecondaryButtonClass,
  severityClass,
} from "./monitoringUi";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminTabTitle } from "@/hooks/useAdminTabTitle";
import { useMonitoringLabel } from "@/hooks/useMonitoringLabel";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export default function AdminMonitoringAnomalyDetail() {
  const { tText } = useAdminT();
  const ml = useMonitoringLabel();
  const { id = "" } = useParams();
  const [data, setData] = useState<MonitoringAnomalyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!id) return Promise.resolve();
    setError(null);
    setLoading(true);
    return getMonitoringAnomalyDetail(id)
      .then((res) => setData(res.data))
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : "加载异常详情失败");
      })
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  async function runAction(fn: () => Promise<unknown>) {
    setActionError(null);
    setBusy(true);
    try {
      await fn();
      await load();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "操作失败");
    } finally {
      setBusy(false);
    }
  }

  const anomaly = data?.anomaly;
  const terminal = anomaly?.status === "resolved" || anomaly?.status === "ignored";

  const tabTitle = useMemo(() => {
    if (!anomaly?.title?.trim()) return null;
    return tText(`异常：${anomaly.title.trim()}`);
  }, [anomaly?.title, tText]);
  useAdminTabTitle(tabTitle, !loading && Boolean(anomaly?.title));

  return (
    <AdminPageShell
      filters={(
        <>
          <MonitoringSubnav />
          <Link className={`text-sm ${monitoringActionLinkClass}`} to="/admin/monitoring/anomalies"><Tx>← 返回异常列表</Tx></Link>
        </>
      )}
    >
      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {actionError ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{actionError}</div> : null}
      {loading ? <div className={`text-sm ${monitoringMutedClass}`}><Tx>加载中...</Tx></div> : null}
      {!loading && !error && !anomaly ? <div className={`text-sm ${monitoringMutedClass}`}><Tx>异常不存在</Tx></div> : null}
      {!loading && anomaly ? (
        <div className="space-y-5">
          <section className={monitoringPanelClass}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge value={anomaly.severity} tone={severityClass[anomaly.severity]} />
              <Badge value={anomaly.status} />
              <span className="font-semibold text-foreground">{anomaly.title}</span>
            </div>
            <div className={`grid gap-3 text-sm ${monitoringMutedClass} md:grid-cols-3`}>
              <div><Tx>规则</Tx>：{ml.rule(anomaly.rule_code, anomaly.title)}</div>
              <div><Tx>模块</Tx>：{ml.module(anomaly.module)}</div>
              <div><Tx>对象</Tx>：{ml.entityRef(anomaly.entity_type, anomaly.entity_id)}</div>
              <div><Tx>原因</Tx>：{ml.rootCause(anomaly.root_cause_message, anomaly.root_cause_code)}</div>
              <div><Tx>首次发现</Tx>：{formatTime(anomaly.first_seen_at)}</div>
              <div><Tx>最近发现</Tx>：{formatTime(anomaly.last_seen_at)}</div>
              <div><Tx>出现次数</Tx>：{anomaly.seen_count}</div>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <UnifiedButton
                type="button"
                className={monitoringPrimaryButtonClass}
                disabled={busy}
                onClick={() => void runAction(() => rescanMonitoringAnomaly(anomaly.id))}
              >
                手动复查
              </UnifiedButton>
              <UnifiedButton
                type="button"
                className={monitoringSecondaryButtonClass}
                disabled={busy || terminal}
                title={terminal ? "已忽略或已解决的异常无需再建任务" : undefined}
                onClick={() => void runAction(() => createRepairTask(anomaly.id))}
              >
                创建修复任务
              </UnifiedButton>
              <UnifiedButton
                type="button"
                className={monitoringSecondaryButtonClass}
                disabled={busy || anomaly.status === "ignored" || anomaly.status === "resolved"}
                onClick={() => void runAction(() => ignoreMonitoringAnomaly(anomaly.id))}
              >
                忽略
              </UnifiedButton>
              <UnifiedButton
                type="button"
                className="rounded border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800 disabled:opacity-40"
                disabled={busy || anomaly.status === "resolved"}
                onClick={() => void runAction(() => resolveMonitoringAnomaly(anomaly.id))}
              >
                标记解决
              </UnifiedButton>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
            <section className={monitoringPanelClass}><h2 className={`mb-3 ${monitoringHeadingClass}`}><Tx>错误值 actual_value</Tx></h2><JsonBlock data={anomaly.actual_value} /></section>
            <section className={monitoringPanelClass}><h2 className={`mb-3 ${monitoringHeadingClass}`}><Tx>正确值 expected_value</Tx></h2><JsonBlock data={anomaly.expected_value} /></section>
            <section className={monitoringPanelClass}><h2 className={`mb-3 ${monitoringHeadingClass}`}><Tx>差异 diff_value</Tx></h2><JsonBlock data={anomaly.diff_value} /></section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className={monitoringPanelClass}>
              <h2 className={`mb-3 ${monitoringHeadingClass}`}><Tx>证据与修复建议</Tx></h2>
              <JsonBlock data={anomaly.evidence} />
            </section>
            <section className={monitoringPanelClass}>
              <h2 className={`mb-3 ${monitoringHeadingClass}`}><Tx>可能原因</Tx></h2>
              <div className={`mb-3 text-sm ${monitoringMutedClass}`}>{anomaly.root_cause_code}：{anomaly.root_cause_message || "-"}</div>
              <JsonBlock data={{ rootCauseCode: anomaly.root_cause_code, message: anomaly.root_cause_message }} />
            </section>
          </div>

          <section className={monitoringPanelClass}>
            <h2 className={`mb-3 ${monitoringHeadingClass}`}><Tx>最近数据变更记录</Tx></h2>
            <JsonBlock data={data.changeEvents} />
          </section>

          <section className={monitoringPanelClass}>
            <h2 className={`mb-3 ${monitoringHeadingClass}`}><Tx>修复任务历史</Tx></h2>
            <JsonBlock data={data.repairTasks} />
          </section>
        </div>
      ) : null}
    </AdminPageShell>
  );
}

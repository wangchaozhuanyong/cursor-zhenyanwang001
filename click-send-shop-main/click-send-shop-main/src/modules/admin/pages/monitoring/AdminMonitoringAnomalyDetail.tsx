import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  createRepairTask,
  getMonitoringAnomalyDetail,
  rescanMonitoringAnomaly,
  type MonitoringAnomalyDetail,
} from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import { Badge, formatTime, JsonBlock, severityClass } from "./monitoringUi";
import {
  formatMonitoringEntityRef,
  formatMonitoringModuleLabel,
  formatMonitoringRuleLabel,
  formatMonitoringRootCause,
} from "./monitoringLabels";

export default function AdminMonitoringAnomalyDetail() {
  const { id = "" } = useParams();
  const [data, setData] = useState<MonitoringAnomalyDetail | null>(null);

  useEffect(() => {
    if (!id) return;
    getMonitoringAnomalyDetail(id).then((res) => setData(res.data));
  }, [id]);

  const anomaly = data?.anomaly;

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">异常详情</h1>
      <MonitoringSubnav />
      {!anomaly ? <div className="text-sm text-slate-500">加载中...</div> : (
        <div className="space-y-5">
          <section className="rounded border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <Badge value={anomaly.severity} tone={severityClass[anomaly.severity]} />
              <Badge value={anomaly.status} />
              <span className="font-semibold text-slate-900">{anomaly.title}</span>
            </div>
            <div className="grid gap-3 text-sm text-slate-600 md:grid-cols-3">
              <div>规则：{formatMonitoringRuleLabel(anomaly.rule_code, anomaly.title)}</div>
              <div>模块：{formatMonitoringModuleLabel(anomaly.module)}</div>
              <div>对象：{formatMonitoringEntityRef(anomaly.entity_type, anomaly.entity_id)}</div>
              <div>原因：{formatMonitoringRootCause(anomaly.root_cause_message, anomaly.root_cause_code)}</div>
              <div>首次发现：{formatTime(anomaly.first_seen_at)}</div>
              <div>最近发现：{formatTime(anomaly.last_seen_at)}</div>
              <div>出现次数：{anomaly.seen_count}</div>
            </div>
            <div className="mt-4 flex gap-2">
              <button className="rounded bg-slate-900 px-3 py-2 text-sm font-semibold text-white" onClick={async () => { await rescanMonitoringAnomaly(anomaly.id); load(); }}>手动复查</button>
              <button className="rounded border px-3 py-2 text-sm font-semibold" onClick={async () => { await createRepairTask(anomaly.id); load(); }}>创建修复任务</button>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-3">
            <section className="rounded border border-slate-200 bg-white p-4"><h2 className="mb-3 font-semibold">错误值 actual_value</h2><JsonBlock data={anomaly.actual_value} /></section>
            <section className="rounded border border-slate-200 bg-white p-4"><h2 className="mb-3 font-semibold">正确值 expected_value</h2><JsonBlock data={anomaly.expected_value} /></section>
            <section className="rounded border border-slate-200 bg-white p-4"><h2 className="mb-3 font-semibold">差异 diff_value</h2><JsonBlock data={anomaly.diff_value} /></section>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold">证据与修复建议</h2>
              <JsonBlock data={anomaly.evidence} />
            </section>
            <section className="rounded border border-slate-200 bg-white p-4">
              <h2 className="mb-3 font-semibold">可能原因</h2>
              <div className="mb-3 text-sm text-slate-700">{anomaly.root_cause_code}：{anomaly.root_cause_message || "-"}</div>
              <JsonBlock data={{ rootCauseCode: anomaly.root_cause_code, message: anomaly.root_cause_message }} />
            </section>
          </div>

          <section className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold">最近数据变更记录</h2>
            <JsonBlock data={data.changeEvents} />
          </section>

          <section className="rounded border border-slate-200 bg-white p-4">
            <h2 className="mb-3 font-semibold">修复任务历史</h2>
            <JsonBlock data={data.repairTasks} />
          </section>
        </div>
      )}
    </div>
  );
}

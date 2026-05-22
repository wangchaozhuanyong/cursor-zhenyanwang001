import { useCallback, useEffect, useState } from "react";
import {
  getMonitoringRules,
  runMonitoringRule,
  updateMonitoringRule,
  type MonitoringRule,
  type MonitoringSeverity,
} from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import { Badge, severityClass } from "./monitoringUi";
import { formatMonitoringModuleLabel } from "./monitoringLabels";

const severityOptions: MonitoringSeverity[] = ["P0", "P1", "P2", "P3", "INFO"];

export default function AdminMonitoringRules() {
  const [rules, setRules] = useState<MonitoringRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    setLoading(true);
    return getMonitoringRules()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setRules(list);
      })
      .catch((err: unknown) => {
        setRules([]);
        setError(err instanceof Error ? err.message : "加载监控规则失败");
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function update(rule: MonitoringRule, patch: Partial<MonitoringRule>) {
    await updateMonitoringRule(rule.code, patch);
    await load();
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">监控规则</h1>
      <MonitoringSubnav />
      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="text-sm text-slate-500">加载中...</div> : null}
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3">规则编码</th><th className="p-3">模块</th><th className="p-3">名称</th><th className="p-3">严重等级</th><th className="p-3">启用</th><th className="p-3">自动修复</th><th className="p-3">定时</th><th className="p-3">操作</th></tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.code} className="border-t">
                <td className="p-3 font-mono text-[11px] text-slate-500">{rule.code}</td>
                <td className="p-3">{formatMonitoringModuleLabel(rule.module)}</td>
                <td className="p-3">
                  <div className="font-medium text-slate-900">{rule.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{rule.description}</div>
                </td>
                <td className="p-3">
                  <select
                    className="rounded border px-2 py-1"
                    value={rule.severity}
                    onChange={(e) => void update(rule, { severity: e.target.value as MonitoringSeverity })}
                  >
                    {severityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="ml-2"><Badge value={rule.severity} tone={severityClass[rule.severity]} /></span>
                </td>
                <td className="p-3"><input type="checkbox" checked={Boolean(rule.enabled)} onChange={(e) => void update(rule, { enabled: e.target.checked })} /></td>
                <td className="p-3"><input type="checkbox" checked={Boolean(rule.auto_fix_enabled)} onChange={(e) => void update(rule, { auto_fix_enabled: e.target.checked })} /></td>
                <td className="p-3">
                  <input className="w-48 rounded border px-2 py-1 font-mono text-xs" defaultValue={rule.schedule_cron || ""} onBlur={(e) => void update(rule, { schedule_cron: e.target.value })} />
                </td>
                <td className="p-3">
                  <button
                    type="button"
                    className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                    onClick={() => void runMonitoringRule(rule.code).then(() => load())}
                  >
                    手动执行
                  </button>
                </td>
              </tr>
            ))}
            {!loading && !rules.length ? (
              <tr><td className="p-6 text-center text-slate-500" colSpan={8}>暂无监控规则</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { getMonitoringRules, runMonitoringRule, updateMonitoringRule, type MonitoringRule, type MonitoringSeverity } from "@/services/admin/monitoringService";
import MonitoringSubnav, { Badge, severityClass } from "./MonitoringSubnav";

const severityOptions: MonitoringSeverity[] = ["P0", "P1", "P2", "P3", "INFO"];

export default function AdminMonitoringRules() {
  const [rules, setRules] = useState<MonitoringRule[]>([]);

  const load = () => getMonitoringRules().then((res) => setRules(res.data));
  useEffect(load, []);

  async function update(rule: MonitoringRule, patch: Partial<MonitoringRule>) {
    await updateMonitoringRule(rule.code, patch);
    load();
  }

  return (
    <div className="p-6">
      <h1 className="mb-4 text-2xl font-bold text-slate-900">监控规则</h1>
      <MonitoringSubnav />
      <div className="overflow-x-auto rounded border border-slate-200 bg-white">
        <table className="w-full min-w-[1100px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr><th className="p-3">rule_code</th><th className="p-3">模块</th><th className="p-3">名称</th><th className="p-3">严重等级</th><th className="p-3">启用</th><th className="p-3">自动修复</th><th className="p-3">cron</th><th className="p-3">操作</th></tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.code} className="border-t">
                <td className="p-3 font-mono text-xs">{rule.code}</td>
                <td className="p-3">{rule.module}</td>
                <td className="p-3">
                  <div className="font-medium text-slate-900">{rule.title}</div>
                  <div className="mt-1 text-xs text-slate-500">{rule.description}</div>
                </td>
                <td className="p-3">
                  <select className="rounded border px-2 py-1" value={rule.severity} onChange={(e) => update(rule, { severity: e.target.value as MonitoringSeverity })}>
                    {severityOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <span className="ml-2"><Badge value={rule.severity} tone={severityClass[rule.severity]} /></span>
                </td>
                <td className="p-3"><input type="checkbox" checked={Boolean(rule.enabled)} onChange={(e) => update(rule, { enabled: e.target.checked })} /></td>
                <td className="p-3"><input type="checkbox" checked={Boolean(rule.auto_fix_enabled)} onChange={(e) => update(rule, { auto_fix_enabled: e.target.checked })} /></td>
                <td className="p-3">
                  <input className="w-48 rounded border px-2 py-1 font-mono text-xs" defaultValue={rule.schedule_cron || ""} onBlur={(e) => update(rule, { schedule_cron: e.target.value })} />
                </td>
                <td className="p-3">
                  <button className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white" onClick={async () => { await runMonitoringRule(rule.code); }}>手动执行</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

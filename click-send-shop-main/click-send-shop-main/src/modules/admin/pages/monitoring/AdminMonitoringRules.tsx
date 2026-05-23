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
import {
  formatCronScheduleLabel,
  formatMonitoringModuleLabel,
  formatMonitoringRuleDescription,
  formatMonitoringRuleLabel,
  formatMonitoringSeverityLabel,
} from "./monitoringLabels";

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
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="p-3">规则</th>
              <th className="p-3 w-20">模块</th>
              <th className="p-3 w-36">严重等级</th>
              <th className="p-3 w-16">启用</th>
              <th className="p-3 w-20">自动修复</th>
              <th className="p-3 w-44">执行频率</th>
              <th className="p-3 w-24">操作</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const ruleTitle = formatMonitoringRuleLabel(rule.code, rule.title);
              const ruleDesc = formatMonitoringRuleDescription(rule.code, rule.description);
              const scheduleLabel = formatCronScheduleLabel(rule.schedule_cron);

              return (
                <tr key={rule.code} className="border-t align-top">
                  <td className="p-3">
                    <div className="font-medium text-slate-900">{ruleTitle}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-600">{ruleDesc}</div>
                  </td>
                  <td className="whitespace-nowrap p-3 text-slate-900">{formatMonitoringModuleLabel(rule.module)}</td>
                  <td className="p-3">
                    <select
                      className="w-full max-w-[7.5rem] rounded border px-2 py-1 text-sm"
                      value={rule.severity}
                      onChange={(e) => void update(rule, { severity: e.target.value as MonitoringSeverity })}
                    >
                      {severityOptions.map((s) => (
                        <option key={s} value={s}>
                          {formatMonitoringSeverityLabel(s) || s}
                        </option>
                      ))}
                    </select>
                    <span className="mt-1 inline-block">
                      <Badge value={rule.severity} tone={severityClass[rule.severity]} />
                    </span>
                  </td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={Boolean(rule.enabled)}
                      onChange={(e) => void update(rule, { enabled: e.target.checked })}
                      aria-label={`${ruleTitle} 启用`}
                    />
                  </td>
                  <td className="p-3">
                    <input
                      type="checkbox"
                      checked={Boolean(rule.auto_fix_enabled)}
                      onChange={(e) => void update(rule, { auto_fix_enabled: e.target.checked })}
                      aria-label={`${ruleTitle} 自动修复`}
                    />
                  </td>
                  <td className="p-3">
                    <div className="text-sm font-medium text-slate-800">{scheduleLabel}</div>
                    <input
                      className="mt-1.5 w-full rounded border px-2 py-1 text-xs text-slate-600"
                      defaultValue={rule.schedule_cron || ""}
                      placeholder="高级：Cron 表达式"
                      title="技术人员可编辑 Cron，格式：分 时 日 月 周"
                      onBlur={(e) => void update(rule, { schedule_cron: e.target.value })}
                    />
                  </td>
                  <td className="p-3">
                    <button
                      type="button"
                      className="whitespace-nowrap rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                      onClick={() => void runMonitoringRule(rule.code).then(() => load())}
                    >
                      手动执行
                    </button>
                  </td>
                </tr>
              );
            })}
            {!loading && !rules.length ? (
              <tr>
                <td className="p-6 text-center text-slate-500" colSpan={7}>
                  暂无监控规则
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-slate-500">
        说明：执行频率已转换为中文便于阅读；如需修改调度，可在「执行频率」下方填写 Cron（分 时 日 月 周）。
      </p>
    </div>
  );
}

import { useCallback, useEffect, useState } from "react";
import {
  getMonitoringRules,
  runMonitoringRule,
  updateMonitoringRule,
  type MonitoringRule,
  type MonitoringSeverity,
} from "@/services/admin/monitoringService";
import MonitoringSubnav from "./MonitoringSubnav";
import AdminNativeTable from "@/components/admin/AdminNativeTable";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { useAdminT } from "@/hooks/useAdminT";
import { useMonitoringLabel } from "@/hooks/useMonitoringLabel";
import {
  ADMIN_TABLE_NOWRAP_CLASS,
  ADMIN_TABLE_WRAP_CLASS,
  adminTdClassName,
  adminThClassName,
} from "@/utils/adminTableClasses";

const severityOptions: MonitoringSeverity[] = ["P0", "P1", "P2", "P3", "INFO"];

export default function AdminMonitoringRules() {
  const { tText } = useAdminT();
  const ml = useMonitoringLabel();
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
    <AdminPageShell
      hint={<Tx>启用/停用规则、调整严重等级与 Cron，并可手动触发一次检测。</Tx>}
      filters={<MonitoringSubnav />}
    >
      {error ? <div className="mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div> : null}
      {loading ? <div className="text-sm text-slate-500"><Tx>加载中...</Tx></div> : null}
      <AdminNativeTable tableClassName="admin-table-fixed">
          <colgroup>
            <col style={{ width: "44%" }} />
            <col style={{ width: "10rem" }} />
            <col style={{ width: "8.5rem" }} />
            <col style={{ width: "5.5rem" }} />
            <col style={{ width: "6.5rem" }} />
            <col style={{ width: "16rem" }} />
            <col style={{ width: "8rem" }} />
          </colgroup>
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className={adminThClassName("text-left", "left")}><Tx>规则</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "left")}><Tx>模块</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}><Tx>严重等级</Tx></th>
              <th className={adminThClassName(undefined, "center")}><Tx>启用</Tx></th>
              <th className={adminThClassName(undefined, "center")}><Tx>自动修复</Tx></th>
              <th className={adminThClassName(undefined, "left")}><Tx>执行频率</Tx></th>
              <th className={adminThClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}><Tx>操作</Tx></th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => {
              const ruleTitle = ml.rule(rule.code, rule.title);
              const ruleDesc = ml.ruleDescription(rule.code, rule.description);
              const scheduleLabel = ml.cron(rule.schedule_cron);

              return (
                <tr key={rule.code} className="border-t align-top">
                  <td className={adminTdClassName(`${ADMIN_TABLE_WRAP_CLASS} text-left`, "left")}>
                    <div className="font-medium text-slate-900">{ruleTitle}</div>
                    <div className="mt-1 text-xs leading-relaxed text-slate-600">{ruleDesc}</div>
                  </td>
                  <td className={adminTdClassName(`${ADMIN_TABLE_NOWRAP_CLASS} text-slate-900`, "left")}>{ml.module(rule.module)}</td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "center")}>
                    <select
                      className="min-w-[6.5rem] rounded border px-2 py-1 text-sm"
                      value={rule.severity}
                      onChange={(e) => void update(rule, { severity: e.target.value as MonitoringSeverity })}
                    >
                      {severityOptions.map((s) => (
                        <option key={s} value={s}>
                          {ml.severity(s) || s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={adminTdClassName(undefined, "center")}>
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={Boolean(rule.enabled)}
                        onChange={(e) => void update(rule, { enabled: e.target.checked })}
                        aria-label={`${ruleTitle} 启用`}
                      />
                    </div>
                  </td>
                  <td className={adminTdClassName(undefined, "center")}>
                    <div className="flex items-center justify-center">
                      <input
                        type="checkbox"
                        className="h-4 w-4"
                        checked={Boolean(rule.auto_fix_enabled)}
                        onChange={(e) => void update(rule, { auto_fix_enabled: e.target.checked })}
                        aria-label={`${ruleTitle} 自动修复`}
                      />
                    </div>
                  </td>
                  <td className={adminTdClassName(undefined, "left")}>
                    <div className="text-sm font-medium text-slate-800">{scheduleLabel}</div>
                    <input
                      className="mt-1.5 w-full rounded border px-2 py-1 text-xs text-slate-600"
                      defaultValue={rule.schedule_cron || ""}
                      placeholder={tText("高级：Cron 表达式")}
                      title={tText("技术人员可编辑 Cron，格式：分 时 日 月 周")}
                      onBlur={(e) => void update(rule, { schedule_cron: e.target.value })}
                    />
                  </td>
                  <td className={adminTdClassName(ADMIN_TABLE_NOWRAP_CLASS, "right")}>
                    <button
                      type="button"
                      className="rounded bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
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
                <td className={adminTdClassName("py-6 text-center text-slate-500")} colSpan={7}>
                  暂无监控规则
                </td>
              </tr>
            ) : null}
          </tbody>
      </AdminNativeTable>
      <p className="mt-3 text-xs text-slate-500">
        说明：执行频率已转换为中文便于阅读；如需修改调度，可在「执行频率」下方填写 Cron（分 时 日 月 周）。
      </p>
    </AdminPageShell>
  );
}

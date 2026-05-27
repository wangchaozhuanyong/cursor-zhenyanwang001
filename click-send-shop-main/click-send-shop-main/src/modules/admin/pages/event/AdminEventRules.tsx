import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { Tx } from "@/components/admin/AdminText";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import * as eventService from "@/services/admin/eventCenterService";
import type { AdminEventRule, AdminEventRulePatch, AdminEventSeverity } from "@/services/admin/eventCenterService";

const severityOptions: AdminEventSeverity[] = ["P0", "P1", "P2", "P3"];

export default function AdminEventRules() {
  const queryClient = useQueryClient();
  const rulesQuery = useQuery({
    queryKey: adminQueryKeys.eventCenterRules(),
    queryFn: eventService.fetchAdminEventRules,
  });
  const mutation = useMutation({
    mutationFn: ({ rule, patch }: { rule: AdminEventRule; patch: AdminEventRulePatch }) => eventService.updateAdminEventRule(rule.event_type, patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: adminQueryKeys.eventCenterRules() });
    },
  });

  function update(rule: AdminEventRule, patch: AdminEventRulePatch) {
    mutation.mutate({ rule, patch });
  }

  const rules = rulesQuery.data || [];

  return (
    <AdminPageShell hint={<Tx>配置事件是否启用、严重等级、弹窗、声音、升级时间、升级目标和自动恢复策略。修改会写入审计日志和后台事件动作记录。</Tx>}>
      <div className="overflow-x-auto rounded-lg border border-border bg-card">
        <table className="min-w-[1120px] w-full text-sm">
          <thead className="bg-secondary text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2 text-left">事件类型</th>
              <th className="px-3 py-2">分类</th>
              <th className="px-3 py-2">等级</th>
              <th className="px-3 py-2">启用</th>
              <th className="px-3 py-2">弹窗</th>
              <th className="px-3 py-2">声音</th>
              <th className="px-3 py-2">升级分钟</th>
              <th className="px-3 py-2">升级目标</th>
              <th className="px-3 py-2">自动恢复</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.event_type} className="border-t border-border">
                <td className="px-3 py-2">
                  <div className="font-medium text-foreground">{rule.title}</div>
                  <div className="text-xs text-muted-foreground">{rule.event_type}</div>
                </td>
                <td className="px-3 py-2 text-center">{rule.category}</td>
                <td className="px-3 py-2 text-center">
                  <select className="rounded border px-2 py-1" value={rule.severity} onChange={(e) => update(rule, { severity: e.target.value })}>
                    {severityOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={Boolean(rule.enabled)} onChange={(e) => update(rule, { enabled: e.target.checked })} /></td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={Boolean(rule.popup_enabled)} onChange={(e) => update(rule, { popup_enabled: e.target.checked })} /></td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={Boolean(rule.sound_enabled)} onChange={(e) => update(rule, { sound_enabled: e.target.checked })} /></td>
                <td className="px-3 py-2 text-center">
                  <input className="w-24 rounded border px-2 py-1" defaultValue={rule.escalation_minutes ?? ""} onBlur={(e) => update(rule, { escalation_minutes: e.target.value ? Number(e.target.value) : null })} />
                </td>
                <td className="px-3 py-2 text-center">
                  <input className="w-36 rounded border px-2 py-1" defaultValue={rule.escalation_target ?? ""} onBlur={(e) => update(rule, { escalation_target: e.target.value || null })} />
                </td>
                <td className="px-3 py-2 text-center"><input type="checkbox" checked={Boolean(rule.auto_resolve_enabled)} onChange={(e) => update(rule, { auto_resolve_enabled: e.target.checked })} /></td>
              </tr>
            ))}
            {!rules.length ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">{rulesQuery.isLoading ? "加载中..." : "暂无事件规则"}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminPageShell>
  );
}

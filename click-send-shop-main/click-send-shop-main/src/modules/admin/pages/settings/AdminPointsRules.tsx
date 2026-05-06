import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchPointsRules, updatePointsRule } from "@/services/admin/pointsService";
import { toastErrorMessage } from "@/utils/errorMessage";

interface PointRule {
  id: string;
  name: string;
  action: string;
  points: number;
  enabled: boolean;
}

export default function AdminPointsRules() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<PointRule[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchPointsRules()
      .then(setRules)
      .catch((e) => toast.error(toastErrorMessage(e, "加载积分规则失败")))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (id: string, field: keyof PointRule, value: any) => {
    setRules(rules.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const rule of rules) {
        await updatePointsRule(rule.id, { name: rule.name, points: rule.points, enabled: rule.enabled } as any);
      }
      toast.success("积分规则已保存");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存失败"));
    } finally {
      setSaving(false);
    }
  };

  const actionLabels: Record<string, string> = {
    sign_in: "每日签到",
    order: "下单奖励",
    invite: "邀请奖励",
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground">积分规则设置</h1>
        <p className="text-sm text-muted-foreground">配置各类积分获取规则</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className={`rounded-xl border bg-card p-5 transition-all ${rule.enabled ? "border-border" : "border-border opacity-60"}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-foreground">{rule.name}</h3>
                <p className="text-xs text-muted-foreground">{actionLabels[rule.action] || rule.action}</p>
              </div>
              <PermissionGate permission="points.manage">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-gold" checked={rule.enabled} onChange={(e) => updateField(rule.id, "enabled", e.target.checked)} />
                  <span className="text-muted-foreground">{rule.enabled ? "启用" : "禁用"}</span>
                </label>
              </PermissionGate>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">奖励积分</label>
              <PermissionGate permission="points.manage">
                <input type="number" value={rule.points} onChange={(e) => updateField(rule.id, "points", Number(e.target.value))} className="w-32 rounded-lg bg-secondary px-4 py-2.5 text-sm text-foreground outline-none" />
              </PermissionGate>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无积分规则</div>
        )}

        {rules.length > 0 && (
          <>
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">当前规则预览</h3>
              <div className="space-y-2">
                {rules.filter((r) => r.enabled).map((r) => (
                  <div key={r.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.name}</span>
                    <span className="font-semibold text-gold">{r.points} 积分</span>
                  </div>
                ))}
              </div>
            </div>

            <PermissionGate permission="points.manage">
              <button disabled={saving} onClick={handleSave} className="rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">
                {saving ? <Loader2 className="inline h-4 w-4 animate-spin" /> : "保存设置"}
              </button>
            </PermissionGate>
          </>
        )}
      </div>
    </div>
  );
}

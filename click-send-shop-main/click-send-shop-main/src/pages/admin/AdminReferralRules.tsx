import { useState, useEffect } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchReferralRules, updateReferralRule } from "@/services/admin/inviteService";

interface ReferralRule {
  id: string;
  level: number;
  name: string;
  rewardPercent: number;
  enabled: boolean;
}

export default function AdminReferralRules() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rules, setRules] = useState<ReferralRule[]>([]);

  useEffect(() => {
    setLoading(true);
    fetchReferralRules()
      .then(setRules)
      .catch(() => toast.error("加载返现规则失败"))
      .finally(() => setLoading(false));
  }, []);

  const updateField = (id: string, field: keyof ReferralRule, value: any) => {
    setRules(rules.map((r) => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const rule of rules) {
        await updateReferralRule(rule.id, { name: rule.name, rewardPercent: rule.rewardPercent, enabled: rule.enabled } as any);
      }
      toast.success("返现规则已保存");
    } catch {
      toast.error("保存失败");
    } finally {
      setSaving(false);
    }
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
        <h1 className="text-xl font-bold text-foreground">返现规则设置</h1>
        <p className="text-sm text-muted-foreground">配置邀请返现的比例和层级</p>
      </div>

      <div className="max-w-2xl space-y-4">
        {rules.map((rule) => (
          <div key={rule.id} className={`rounded-xl border bg-card p-5 transition-all ${rule.enabled ? "border-border" : "border-border opacity-60"}`}>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-medium text-foreground">{rule.name}</h3>
                <p className="text-xs text-muted-foreground">第 {rule.level} 级返现</p>
              </div>
              <PermissionGate permission="referral.manage">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="accent-gold" checked={rule.enabled} onChange={(e) => updateField(rule.id, "enabled", e.target.checked)} />
                  <span className="text-muted-foreground">{rule.enabled ? "启用" : "禁用"}</span>
                </label>
              </PermissionGate>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">返现比例</label>
              <PermissionGate permission="referral.manage">
                <div className="flex items-center gap-2">
                  <input type="number" value={rule.rewardPercent} onChange={(e) => updateField(rule.id, "rewardPercent", Number(e.target.value))} className="w-24 rounded-lg bg-secondary px-4 py-2.5 text-center text-sm text-foreground outline-none" />
                  <span className="text-sm text-muted-foreground">%</span>
                </div>
              </PermissionGate>
              <p className="mt-1 text-[10px] text-muted-foreground">下级消费金额的 {rule.rewardPercent}% 作为上级奖励</p>
            </div>
          </div>
        ))}
        {rules.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无返现规则</div>
        )}

        {rules.length > 0 && (
          <>
            <div className="rounded-xl border border-gold/30 bg-gold/5 p-5">
              <h3 className="mb-3 text-sm font-semibold text-foreground">规则预览</h3>
              <div className="space-y-2">
                {rules.filter((r) => r.enabled).map((r) => (
                  <div key={r.id} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{r.name} (Level {r.level})</span>
                    <span className="font-semibold text-gold">{r.rewardPercent}%</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-[10px] text-muted-foreground">
                示例：下级消费 RM 100，一级奖励 RM {(100 * (rules[0]?.rewardPercent || 0) / 100).toFixed(2)}
                {rules[1]?.enabled && `，二级奖励 RM ${(100 * (rules[1]?.rewardPercent || 0) / 100).toFixed(2)}`}
              </p>
            </div>

            <PermissionGate permission="referral.manage">
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

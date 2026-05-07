import { useEffect, useState } from "react";
import { Loader2, RotateCcw, TrendingDown, TrendingUp, Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchAdminRewardRecords } from "@/services/admin/rewardService";
import { fetchReferralRules, updateReferralRule } from "@/services/admin/inviteService";
import type { RewardRecord, RewardStats, RewardStatus } from "@/types/reward";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";

const statusOptions: Array<{ value: "" | RewardStatus; label: string }> = [
  { value: "", label: "全部状态" },
  { value: "approved", label: "已入账" },
  { value: "paid", label: "已提现" },
  { value: "reversed", label: "已冲正" },
  { value: "pending", label: "待处理" },
  { value: "rejected", label: "已拒绝" },
];

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "待处理", className: "bg-amber-500/10 text-amber-600" },
  approved: { label: "已入账", className: "bg-green-500/10 text-green-600" },
  paid: { label: "已提现", className: "bg-blue-500/10 text-blue-600" },
  rejected: { label: "已拒绝", className: "bg-muted text-muted-foreground" },
  reversed: { label: "已冲正", className: "bg-destructive/10 text-destructive" },
};

const emptyStats: RewardStats = {
  settledAmount: 0,
  reversedAmount: 0,
  totalRecords: 0,
  rewardedUsers: 0,
};

function money(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n.toFixed(2) : "0.00";
}

export default function AdminRewardRecords() {
  const [records, setRecords] = useState<RewardRecord[]>([]);
  const [stats, setStats] = useState<RewardStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"" | RewardStatus>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rules, setRules] = useState<Array<{ id: string; level: number; name: string; rewardPercent: number; enabled: boolean }>>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchAdminRewardRecords({ page, pageSize, keyword, status: status || undefined })
      .then((data) => {
        if (cancelled) return;
        setRecords(data.list || []);
        setStats(data.stats || emptyStats);
        setTotal(data.total || 0);
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载返现记录失败")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, pageSize, keyword, status]);

  useEffect(() => {
    let cancelled = false;
    setRulesLoading(true);
    fetchReferralRules()
      .then((data: any[]) => {
        if (cancelled) return;
        const normalized = (Array.isArray(data) ? data : []).map((r: any, idx) => ({
          id: String(r.id ?? idx),
          level: Number(r.level ?? idx + 1),
          name: String(r.name ?? `Level ${idx + 1}`),
          rewardPercent: Number(r.rewardPercent ?? 0),
          enabled: Boolean(r.enabled ?? true),
        }));
        setRules(normalized);
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载返现规则失败")))
      .finally(() => {
        if (!cancelled) setRulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRuleField = (id: string, field: "rewardPercent" | "enabled", value: number | boolean) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const saveRules = async () => {
    setRulesSaving(true);
    try {
      for (const rule of rules) {
        await updateReferralRule(rule.id, {
          name: rule.name,
          rewardPercent: rule.rewardPercent,
          enabled: rule.enabled,
        } as any);
      }
      toast.success("返现规则已保存");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存返现规则失败"));
    } finally {
      setRulesSaving(false);
    }
  };

  const cards = [
    { label: "累计入账", value: `RM ${money(stats.settledAmount)}`, icon: TrendingUp, className: "text-[var(--theme-price)]" },
    { label: "累计冲正", value: `RM ${money(stats.reversedAmount)}`, icon: TrendingDown, className: "text-destructive" },
    { label: "返现记录", value: String(stats.totalRecords || 0), icon: RotateCcw, className: "text-[var(--theme-price)]" },
    { label: "获奖用户", value: String(stats.rewardedUsers || 0), icon: Users, className: "text-[var(--theme-secondary)]" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">返现记录</h1>
        <p className="text-sm text-muted-foreground">查看邀请返现入账、冲正和结算状态，用于查账和争议处理</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="theme-shadow rounded-xl border border-[var(--theme-border)] bg-theme-surface p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-theme-muted">{card.label}</p>
              <card.icon size={18} className={card.className} />
            </div>
            <p className="mt-2 text-lg font-bold text-[var(--theme-text-on-surface)]">{card.value}</p>
          </div>
        ))}
      </div>

      <section className="rounded-xl border border-[var(--theme-border)] bg-theme-surface p-4 theme-shadow">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[var(--theme-text-on-surface)]">返现规则</h2>
          <p className="text-xs text-theme-muted">返现规则与返现记录同页维护，修改后点击保存。</p>
        </div>
        {rulesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--theme-price)]" />
          </div>
        ) : rules.length === 0 ? (
          <div className="py-8 text-center text-sm text-theme-muted">暂无返现规则</div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))] px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-[var(--theme-text-on-surface)]">{rule.name}</p>
                  <p className="text-[11px] text-theme-muted">第 {rule.level} 级返现</p>
                </div>
                <div className="flex items-center gap-2">
                  <PermissionGate permission="referral.manage">
                    <label className="flex items-center gap-1.5 text-xs text-theme-muted">
                      <input
                        type="checkbox"
                        className="accent-[var(--theme-price)]"
                        checked={rule.enabled}
                        onChange={(e) => updateRuleField(rule.id, "enabled", e.target.checked)}
                      />
                      启用
                    </label>
                  </PermissionGate>
                  <PermissionGate permission="referral.manage">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={rule.rewardPercent}
                        onChange={(e) => updateRuleField(rule.id, "rewardPercent", Number(e.target.value))}
                        className="w-20 rounded-md border border-[var(--theme-border)] bg-theme-surface px-2 py-1.5 text-right text-xs text-[var(--theme-text-on-surface)] outline-none"
                      />
                      <span className="text-xs text-theme-muted">%</span>
                    </div>
                  </PermissionGate>
                </div>
              </div>
            ))}
            <PermissionGate permission="referral.manage">
              <button
                type="button"
                disabled={rulesSaving}
                onClick={saveRules}
                className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-xs font-semibold text-[var(--theme-price-foreground)] disabled:opacity-60"
              >
                {rulesSaving ? "保存中..." : "保存返现规则"}
              </button>
            </PermissionGate>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <SearchBar
            placeholder="搜索订单号 / 用户ID..."
            value={keyword}
            onChange={(v) => { setKeyword(v); setPage(1); }}
          />
        </div>
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value as "" | RewardStatus); setPage(1); }}
          className="min-h-[44px] rounded-xl border border-[var(--theme-border)] bg-theme-surface px-3 text-sm text-[var(--theme-text-on-surface)] outline-none"
        >
          {statusOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center rounded-xl border border-[var(--theme-border)] bg-theme-surface py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-price)]" />
        </div>
      ) : (
        <div className="theme-shadow overflow-x-auto rounded-xl border border-[var(--theme-border)] bg-theme-surface">
          <table className="w-full min-w-[940px] text-sm">
            <thead>
              <tr className="border-b border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))]">
                {["用户", "订单号", "层级", "订单金额", "比例", "返现金额", "状态", "备注", "时间"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-theme-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const label = statusLabels[record.status] || { label: record.status, className: "bg-muted text-muted-foreground" };
                return (
                  <tr key={record.id} className="border-b border-[var(--theme-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--theme-primary)_5%,transparent)]">
                    <td className="px-4 py-3">
                      <p className="text-[var(--theme-text-on-surface)]">{record.user_nickname || record.user_phone || record.user_id}</p>
                      <p className="font-mono text-[10px] text-theme-muted">{record.user_id}</p>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-on-surface)]">{record.order_no || "—"}</td>
                    <td className="px-4 py-3 text-theme-muted">L{record.level || 1}</td>
                    <td className="px-4 py-3 text-theme-muted">RM {money(record.order_amount)}</td>
                    <td className="px-4 py-3 text-theme-muted">{money(record.rate)}%</td>
                    <td className="px-4 py-3 font-semibold text-[var(--theme-price)]">RM {money(record.amount)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-1 text-xs ${label.className}`}>{label.label}</span>
                    </td>
                    <td className="max-w-[220px] truncate px-4 py-3 text-xs text-theme-muted">{record.remark || "—"}</td>
                    <td className="px-4 py-3 text-xs text-theme-muted">
                      {record.created_at ? new Date(record.created_at).toLocaleString("zh-CN") : "—"}
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-theme-muted">暂无返现记录</td>
                </tr>
              )}
            </tbody>
          </table>
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </div>
      )}
    </div>
  );
}

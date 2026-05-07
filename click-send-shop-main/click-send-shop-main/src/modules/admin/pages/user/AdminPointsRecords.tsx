import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2, Star, TrendingDown, TrendingUp, Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchAdminPointsRecords, fetchPointsRules, updatePointsRule } from "@/services/admin/pointsService";
import type { PointsAction, PointsRecord, PointsStats } from "@/types/points";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";

const actionOptions: Array<{ value: "" | PointsAction; label: string }> = [
  { value: "", label: "全部类型" },
  { value: "order_earn", label: "订单奖励" },
  { value: "order_reverse", label: "订单回滚" },
  { value: "sign_in", label: "每日签到" },
  { value: "admin_add", label: "管理员增加" },
  { value: "admin_deduct", label: "管理员扣减" },
  { value: "redeem", label: "积分抵扣" },
];

const actionLabels: Record<string, string> = {
  order: "下单奖励(旧)",
  order_earn: "订单奖励",
  order_reverse: "订单回滚",
  refund: "退款扣回(旧)",
  sign_in: "每日签到",
  invite_reward: "邀请奖励",
  admin_add: "管理员增加",
  admin_deduct: "管理员扣减",
  admin_adjust: "管理员调整",
  redeem: "积分抵扣",
};

const emptyStats: PointsStats = {
  totalEarned: 0,
  totalDeducted: 0,
  totalRecords: 0,
  activeUsers: 0,
};

function intValue(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export default function AdminPointsRecords() {
  const [searchParams] = useSearchParams();
  const [records, setRecords] = useState<PointsRecord[]>([]);
  const [stats, setStats] = useState<PointsStats>(emptyStats);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(searchParams.get("userId") || "");
  const [action, setAction] = useState<"" | PointsAction>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [total, setTotal] = useState(0);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rules, setRules] = useState<Array<{ id: string; name: string; action: string; points: number; enabled: boolean }>>([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const looksLikeUserId = keyword.length >= 20 && !keyword.includes(" ");
    fetchAdminPointsRecords({
      page,
      pageSize,
      keyword: looksLikeUserId ? undefined : keyword,
      userId: looksLikeUserId ? keyword : undefined,
      action: action || undefined,
    })
      .then((data) => {
        if (cancelled) return;
        setRecords(data.list || []);
        setStats(data.stats || emptyStats);
        setTotal(data.total || 0);
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载积分明细失败")))
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [page, pageSize, keyword, action]);

  useEffect(() => {
    let cancelled = false;
    setRulesLoading(true);
    fetchPointsRules()
      .then((data: any[]) => {
        if (cancelled) return;
        const normalized = (Array.isArray(data) ? data : []).map((r: any, idx) => ({
          id: String(r.id ?? idx),
          name: String(r.name ?? "积分规则"),
          action: String(r.action ?? ""),
          points: Number(r.points ?? r.sign_in_points ?? 0),
          enabled: Boolean(r.enabled ?? true),
        }));
        setRules(normalized);
      })
      .catch((e) => toast.error(toastErrorMessage(e, "加载积分规则失败")))
      .finally(() => {
        if (!cancelled) setRulesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const updateRuleField = (id: string, field: "points" | "enabled", value: number | boolean) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const saveRules = async () => {
    setRulesSaving(true);
    try {
      for (const rule of rules) {
        await updatePointsRule(rule.id, { name: rule.name, points: rule.points, enabled: rule.enabled } as any);
      }
      toast.success("积分规则已保存");
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存积分规则失败"));
    } finally {
      setRulesSaving(false);
    }
  };

  const cards = [
    { label: "累计增加", value: String(intValue(stats.totalEarned)), icon: TrendingUp, className: "text-[var(--theme-price)]" },
    { label: "累计扣减/回滚", value: String(intValue(stats.totalDeducted)), icon: TrendingDown, className: "text-destructive" },
    { label: "流水总数", value: String(intValue(stats.totalRecords)), icon: Star, className: "text-[var(--theme-price)]" },
    { label: "涉及用户", value: String(intValue(stats.activeUsers)), icon: Users, className: "text-[var(--theme-secondary)]" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-foreground">积分明细</h1>
        <p className="text-sm text-muted-foreground">查看积分发放、扣减、订单退款回滚和管理员调整流水</p>
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
          <h2 className="text-sm font-semibold text-[var(--theme-text-on-surface)]">积分规则</h2>
          <p className="text-xs text-theme-muted">规则与明细同页管理，修改后点击保存立即生效。</p>
        </div>
        {rulesLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--theme-price)]" />
          </div>
        ) : rules.length === 0 ? (
          <div className="py-8 text-center text-sm text-theme-muted">暂无积分规则</div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))] px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-[var(--theme-text-on-surface)]">{rule.name}</p>
                  <p className="text-[11px] text-theme-muted">{actionLabels[rule.action] || rule.action || "通用规则"}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PermissionGate permission="points.manage">
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
                  <PermissionGate permission="points.manage">
                    <input
                      type="number"
                      value={rule.points}
                      onChange={(e) => updateRuleField(rule.id, "points", Number(e.target.value))}
                      className="w-20 rounded-md border border-[var(--theme-border)] bg-theme-surface px-2 py-1.5 text-right text-xs text-[var(--theme-text-on-surface)] outline-none"
                    />
                  </PermissionGate>
                </div>
              </div>
            ))}
            <PermissionGate permission="points.manage">
              <button
                type="button"
                disabled={rulesSaving}
                onClick={saveRules}
                className="rounded-lg bg-[var(--theme-price)] px-4 py-2 text-xs font-semibold text-[var(--theme-price-foreground)] disabled:opacity-60"
              >
                {rulesSaving ? "保存中..." : "保存积分规则"}
              </button>
            </PermissionGate>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex-1">
          <SearchBar
            placeholder="搜索订单号 / 描述 / 用户ID..."
            value={keyword}
            onChange={(v) => { setKeyword(v); setPage(1); }}
          />
        </div>
        <select
          value={action}
          onChange={(e) => { setAction(e.target.value as "" | PointsAction); setPage(1); }}
          className="min-h-[44px] rounded-xl border border-[var(--theme-border)] bg-theme-surface px-3 text-sm text-[var(--theme-text-on-surface)] outline-none"
        >
          {actionOptions.map((opt) => (
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
                {["用户", "类型", "订单号", "变动", "变动前", "变动后", "说明", "时间"].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-theme-muted">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((record) => {
                const amount = intValue(record.amount);
                return (
                  <tr key={record.id} className="border-b border-[var(--theme-border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--theme-primary)_5%,transparent)]">
                    <td className="px-4 py-3">
                      <p className="text-[var(--theme-text-on-surface)]">{record.user_nickname || record.user_phone || record.user_id}</p>
                      <p className="font-mono text-[10px] text-theme-muted">{record.user_id}</p>
                    </td>
                    <td className="px-4 py-3 text-theme-muted">{actionLabels[record.action] || record.action}</td>
                    <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-on-surface)]">{record.order_no || "—"}</td>
                    <td className={`px-4 py-3 font-semibold ${amount >= 0 ? "text-[var(--theme-price)]" : "text-destructive"}`}>
                      {amount > 0 ? "+" : ""}{amount}
                    </td>
                    <td className="px-4 py-3 text-theme-muted">{record.balance_before ?? "—"}</td>
                    <td className="px-4 py-3 text-[var(--theme-text-on-surface)]">{record.balance_after ?? "—"}</td>
                    <td className="max-w-[260px] truncate px-4 py-3 text-xs text-theme-muted">{record.description || "—"}</td>
                    <td className="px-4 py-3 text-xs text-theme-muted">
                      {record.created_at ? new Date(record.created_at).toLocaleString("zh-CN") : "—"}
                    </td>
                  </tr>
                );
              })}
              {records.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-theme-muted">暂无积分明细</td>
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

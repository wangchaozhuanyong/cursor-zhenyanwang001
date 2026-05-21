import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/utils/formatDateTime";
import { Loader2, RotateCcw, TrendingDown, TrendingUp, Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchAdminRewardRecords } from "@/services/admin/rewardService";
import { fetchReferralRules, updateReferralRule } from "@/services/admin/inviteService";
import type { ReferralRule, ReferralRuleEditRow } from "@/types/invite";
import type { RewardRecord, RewardStats, RewardStatus } from "@/types/reward";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatUserDisplay, labelRewardStatus } from "@/utils/adminDisplayLabels";
import { Tx } from "@/components/admin/AdminText";
import { AdminPageTitle } from "@/components/admin/AdminFieldHint";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { AnimatedTable, LoadingButton } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildRewardRecordFilterChips,
  hasActiveRewardRecordFilters,
  removeRewardRecordFilterChip,
} from "@/utils/adminRewardRecordFilters";
import {
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
  THEME_TEXT_DANGER,
} from "@/utils/themeVisuals";
import { adminQueryKeys } from "@/lib/adminQueryKeys";

const statusOptions: Array<{ value: "" | RewardStatus; label: string }> = [
  { value: "", label: "全部状态" },
  { value: "approved", label: "已入账" },
  { value: "paid", label: "已提现" },
  { value: "reversed", label: "已冲正" },
  { value: "pending", label: "待处理" },
  { value: "rejected", label: "已拒绝" },
];

const statusLabels: Record<string, { label: string; className: string }> = {
  pending: { label: "待处理", className: THEME_BADGE_WARNING },
  approved: { label: "已入账", className: THEME_BADGE_SUCCESS },
  paid: { label: "已提现", className: THEME_BADGE_PRIMARY },
  rejected: { label: "已拒绝", className: THEME_BADGE_MUTED },
  reversed: { label: "已冲正", className: THEME_BADGE_DANGER },
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

function normalizeReferralRules(data: ReferralRule[]): ReferralRuleEditRow[] {
  return data.map((r, idx) => ({
    id: String(r.id ?? idx),
    level: Number(r.level ?? idx + 1),
    name: String(r.description || `等级 ${idx + 1}`),
    rewardPercent: Number(r.commission_rate ?? 0),
    enabled: Boolean(r.enabled ?? true),
  }));
}

export default function AdminRewardRecords() {
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"" | RewardStatus>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rules, setRules] = useState<ReferralRuleEditRow[]>([]);

  const queryParams = useMemo(
    () => ({ page, pageSize, keyword, status: status || undefined }),
    [keyword, page, pageSize, status],
  );

  const listQuery = useQuery({
    queryKey: adminQueryKeys.rewardRecords(queryParams),
    queryFn: () => fetchAdminRewardRecords(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const rulesQuery = useQuery({
    queryKey: adminQueryKeys.referralRules(),
    queryFn: fetchReferralRules,
    staleTime: 60_000,
  });

  const records = listQuery.data?.list ?? [];
  const stats = listQuery.data?.stats ?? emptyStats;
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading && !listQuery.data;
  const rulesLoading = rulesQuery.isLoading && !rulesQuery.data;

  useEffect(() => {
    if (!rulesQuery.data) return;
    setRules(normalizeReferralRules(rulesQuery.data));
  }, [rulesQuery.data]);

  const updateRuleField = (id: string, field: "rewardPercent" | "enabled", value: number | boolean) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const saveRules = async () => {
    setRulesSaving(true);
    try {
      for (const rule of rules) {
        await updateReferralRule(rule.id, {
          description: rule.name,
          commission_rate: rule.rewardPercent,
          enabled: rule.enabled,
        });
      }
      toast.success("返现规则已保存");
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.referralRules() });
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存返现规则失败"));
    } finally {
      setRulesSaving(false);
    }
  };

  const filterState = { keyword, status };
  const filterChips = useMemo(() => buildRewardRecordFilterChips(filterState), [keyword, status]);
  const filtersActive = hasActiveRewardRecordFilters(filterState);
  const emptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.rewardRecordsFiltered : ADMIN_EMPTY_GUIDES.rewardRecords;

  const clearFilters = () => {
    setKeyword("");
    setStatus("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeRewardRecordFilterChip(key);
    if ("keyword" in patch) setKeyword(patch.keyword ?? "");
    if ("status" in patch) setStatus(patch.status ?? "");
    setPage(1);
  };

  const cards = [
    { label: "累计入账", value: `RM ${money(stats.settledAmount)}`, icon: TrendingUp, className: "text-[var(--theme-price)]" },
    { label: "累计冲正", value: `RM ${money(stats.reversedAmount)}`, icon: TrendingDown, className: THEME_TEXT_DANGER },
    { label: "返现记录", value: String(stats.totalRecords || 0), icon: RotateCcw, className: "text-[var(--theme-price)]" },
    { label: "获奖用户", value: String(stats.rewardedUsers || 0), icon: Users, className: "text-[var(--theme-primary)]" },
  ];

  return (
    <div className="space-y-5">
      <div>
        <AdminPageTitle
          title={<Tx>返现记录</Tx>}
          hint={<Tx>查看邀请返现入账、冲正和结算状态，用于查账和争议处理</Tx>}
        />
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
          <h2 className="text-sm font-semibold text-[var(--theme-text-on-surface)]"><Tx>返现规则</Tx></h2>
          <p className="text-xs text-theme-muted"><Tx>返现规则与返现记录同页维护，修改后点击保存。</Tx></p>
        </div>
        {rulesLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between rounded-lg border border-[var(--theme-border)] px-3 py-2.5">
                <div className="space-y-2">
                  <div className="skeleton-base skeleton-shimmer h-4 w-32 rounded" />
                  <div className="skeleton-base skeleton-shimmer h-3 w-48 rounded" />
                </div>
                <div className="skeleton-base skeleton-shimmer h-6 w-11 rounded-full" />
              </div>
            ))}
          </div>
        ) : rules.length === 0 ? (
          <div className="py-8 text-center text-sm text-theme-muted"><Tx>暂无返现规则</Tx></div>
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
                      /><Tx>
                      启用
                    </Tx></label>
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
              <LoadingButton
                type="button"
                variant="gold"
                state={rulesSaving ? "loading" : "normal"}
                loadingText="保存中..."
                onClick={() => void saveRules()}
                className="rounded-lg px-4 py-2 text-xs font-semibold"
              ><Tx>
                保存返现规则
              </Tx></LoadingButton>
            </PermissionGate>
          </div>
        )}
      </section>

      <div className="space-y-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <SearchBar
              placeholder="搜索订单号 / 昵称 / 手机号..."
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
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
      </div>

      <AnimatedTable
        loading={loading}
        rows={records}
        rowKey={(record) => record.id}
        skeletonRows={8}
        skeletonCols={9}
        className="theme-shadow overflow-x-auto rounded-xl border border-[var(--theme-border)] bg-theme-surface"
        tableClassName="w-full min-w-[940px] text-sm"
        theadClassName="border-b border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))]"
        thead={(
          <tr>
            {["用户", "订单号", "层级", "订单金额", "比例", "返现金额", "状态", "备注", "时间"].map((h) => (
              <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-theme-muted">{h}</th>
            ))}
          </tr>
        )}
        footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />}
        emptyIcon={emptyGuide.icon}
        emptyTitle={emptyGuide.title}
        emptyDescription={emptyGuide.description}
        emptyAction={(
          <AdminEmptyGuideActions
            guide={emptyGuide}
            showClearFilters={filtersActive}
            onClearFilters={clearFilters}
          />
        )}
        renderRow={(record) => {
          const label = statusLabels[record.status] || {
            label: labelRewardStatus(record.status),
            className: "bg-muted text-muted-foreground",
          };
          return (
            <>
              <td className="px-4 py-3" title={record.user_id || undefined}>
                <p className="text-[var(--theme-text-on-surface)]">
                  {formatUserDisplay(record.user_nickname, record.user_phone)}
                </p>
              </td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-on-surface)]">{record.order_no || "—"}</td>
              <td className="px-4 py-3 text-theme-muted">L{record.level || 1}</td>
              <td className="px-4 py-3 text-theme-muted">RM {money(record.order_amount)}</td>
              <td className="px-4 py-3 text-theme-muted">{money(record.rate)}%</td>
              <td className="px-4 py-3 font-semibold text-[var(--theme-price)]">RM {money(record.amount)}</td>
              <td className="px-4 py-3">
                <span className={`rounded-full px-2 py-1 text-xs ${label.className}`}>{label.label}</span>
              </td>
              <td className="max-w-[14rem] px-4 py-3 align-middle">
                <AdminTableCell value={record.remark || "—"} fullText={record.remark || ""} maxWidth="13rem" muted />
              </td>
              <td className="px-4 py-3 text-xs text-theme-muted">
                {record.created_at ? formatDateTime(record.created_at) : "—"}
              </td>
            </>
          );
        }}
      />
    </div>
  );
}

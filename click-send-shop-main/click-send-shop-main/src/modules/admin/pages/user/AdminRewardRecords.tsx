import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/utils/formatDateTime";
import { Loader2, RotateCcw, TrendingDown, TrendingUp, Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { AdminFilterSelect } from "@/components/admin/AdminFilterControls";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchAdminRewardRecords } from "@/services/admin/rewardService";
import { fetchReferralRules, updateReferralRule } from "@/services/admin/inviteService";
import { fetchRewardSettings, saveRewardSettings } from "@/services/admin/rewardSettingsService";
import type { ReferralRule, ReferralRuleEditRow, ReferralSettlementTiming } from "@/types/invite";

const REFERRAL_SETTLEMENT_OPTIONS: { value: ReferralSettlementTiming; label: string }[] = [
  { value: "order_paid", label: "付款成功后" },
  { value: "order_shipped", label: "发货后" },
  { value: "order_completed", label: "订单完成后" },
];
import type { RewardRecord, RewardStats, RewardStatus, RewardUsageSettings } from "@/types/reward";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatUserDisplay } from "@/utils/adminDisplayLabels";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { useLocalizedOptions } from "@/hooks/useLocalizedOptions";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { AnimatedTable, LoadingButton } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
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
import { useAdminT } from "@/hooks/useAdminT";
import {
  adminTableCellClass,
  adminTableTheadRow,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";

const REWARD_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "left", "right", "right", "right", "right", "center", "left", "left",
];

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
    name: String(r.name || `等级 ${idx + 1}`),
    rewardPercent: Number(r.rewardPercent ?? 0),
    settlementTiming: (r.settlementTiming || "order_paid") as ReferralSettlementTiming,
    enabled: Boolean(r.enabled ?? true),
  }));
}

export default function AdminRewardRecords({ embedded = false }: { embedded?: boolean }) {
  const { tText } = useAdminT();
  const { rewardStatus: labelRewardStatus, text: L } = useAdminDisplayLabel();
  const statusOptionsLocalized = useLocalizedOptions(statusOptions);
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<"" | RewardStatus>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [displaySaving, setDisplaySaving] = useState(false);
  const [rules, setRules] = useState<ReferralRuleEditRow[]>([]);
  const [displaySettings, setDisplaySettings] = useState<RewardUsageSettings>({
    balanceLabel: "购物可用返现",
    usageNotice: "返现金额仅可用于购物，不可提现。",
  });

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

  const displayQuery = useQuery({
    queryKey: adminQueryKeys.rewardSettings(),
    queryFn: fetchRewardSettings,
    staleTime: 60_000,
  });

  const records = listQuery.data?.list ?? [];
  const stats = listQuery.data?.stats ?? emptyStats;
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading && !listQuery.data;
  const rulesLoading = rulesQuery.isLoading && !rulesQuery.data;
  const displayLoading = displayQuery.isLoading && !displayQuery.data;

  useEffect(() => {
    if (!rulesQuery.data) return;
    setRules(normalizeReferralRules(rulesQuery.data));
  }, [rulesQuery.data]);

  useEffect(() => {
    if (!displayQuery.data) return;
    setDisplaySettings(displayQuery.data);
  }, [displayQuery.data]);

  const updateRuleField = (
    id: string,
    field: "rewardPercent" | "enabled" | "settlementTiming",
    value: number | boolean | ReferralSettlementTiming,
  ) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const saveRules = async () => {
    setRulesSaving(true);
    try {
      for (const rule of rules) {
        await updateReferralRule(rule.id, {
          name: rule.name,
          rewardPercent: rule.rewardPercent,
          settlementTiming: rule.settlementTiming,
          enabled: rule.enabled,
        });
      }
      toast.success(tText("返现规则已保存"));
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.referralRules() });
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存返现规则失败"));
    } finally {
      setRulesSaving(false);
    }
  };

  const saveDisplaySettings = async () => {
    setDisplaySaving(true);
    try {
      await saveRewardSettings(displaySettings);
      toast.success(tText("前台展示设置已保存"));
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.rewardSettings() });
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存展示设置失败"));
    } finally {
      setDisplaySaving(false);
    }
  };

  const filterState = useMemo(() => ({ keyword, status }), [keyword, status]);
  const filterChips = useMemo(() => buildRewardRecordFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveRewardRecordFilters(filterState);
  const emptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.rewardRecordsFiltered : ADMIN_EMPTY_GUIDES.rewardRecords,
  );

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
    { label: tText("累计入账"), value: `RM ${money(stats.settledAmount)}`, icon: TrendingUp, className: "text-[var(--theme-price)]" },
    { label: tText("累计冲正"), value: `RM ${money(stats.reversedAmount)}`, icon: TrendingDown, className: THEME_TEXT_DANGER },
    { label: tText("返现记录"), value: String(stats.totalRecords || 0), icon: RotateCcw, className: "text-[var(--theme-price)]" },
    { label: tText("获奖用户"), value: String(stats.rewardedUsers || 0), icon: Users, className: "text-[var(--theme-primary)]" },
  ];

  const renderMobileCard = (record: RewardRecord) => {
    const status = statusLabels[record.status]
      ? { label: L(statusLabels[record.status].label), className: statusLabels[record.status].className }
      : { label: labelRewardStatus(record.status), className: "bg-muted text-muted-foreground" };

    return (
      <AdminTableMobileCard>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{formatUserDisplay(record.user_nickname, record.user_phone)}</p>
          <span className={`shrink-0 rounded-full px-2 py-1 text-xs ${status.className}`}>{status.label}</span>
        </div>
        <p className="mb-2 text-base font-semibold text-[var(--theme-price)]">RM {money(record.amount)}</p>
        <div className="space-y-2">
          <AdminTableMobileCardField label={tText("订单号")}>
            <span className="font-mono text-xs text-muted-foreground">{record.order_no || "—"}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("订单 / 比例")}>
            <span className="text-xs text-muted-foreground">RM {money(record.order_amount)} · {money(record.rate)}% · {tText("层级")} {record.level || 1}</span>
          </AdminTableMobileCardField>
          {record.remark ? (
            <AdminTableMobileCardField label={tText("备注")}>
              <span className="text-xs text-muted-foreground line-clamp-2">{record.remark}</span>
            </AdminTableMobileCardField>
          ) : null}
          <AdminTableMobileCardField label={tText("时间")}>
            <span className="text-xs text-muted-foreground">{record.created_at ? formatDateTime(record.created_at) : "—"}</span>
          </AdminTableMobileCardField>
        </div>
      </AdminTableMobileCard>
    );
  };

  const body = (
    <>
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
              <div key={rule.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))] px-3 py-2.5">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-[var(--theme-text-on-surface)]">{rule.name}</p>
                  <p className="text-[11px] text-theme-muted">第 {rule.level} 级返现</p>
                  <PermissionGate permission="referral.manage">
                    <label className="mt-1.5 flex items-center gap-1.5 text-[11px] text-theme-muted">
                      <span><Tx>结算时机</Tx></span>
                      <select
                        className="rounded-md border border-[var(--theme-border)] bg-theme-surface px-1.5 py-0.5 text-[11px] text-[var(--theme-text-on-surface)]"
                        value={rule.settlementTiming}
                        onChange={(e) =>
                          updateRuleField(rule.id, "settlementTiming", e.target.value as ReferralSettlementTiming)
                        }
                      >
                        {REFERRAL_SETTLEMENT_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </PermissionGate>
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

      <section className="rounded-xl border border-[var(--theme-border)] bg-theme-surface p-4 theme-shadow">
        <div className="mb-3">
          <h2 className="text-sm font-semibold text-[var(--theme-text-on-surface)]"><Tx>前台展示设置</Tx></h2>
          <p className="text-xs text-theme-muted"><Tx>配置用户返现记录页的余额标签与使用说明，保存后立即生效。</Tx></p>
        </div>
        {displayLoading ? (
          <div className="space-y-3">
            <div className="skeleton-base skeleton-shimmer h-10 w-full rounded-lg" />
            <div className="skeleton-base skeleton-shimmer h-20 w-full rounded-lg" />
          </div>
        ) : (
          <div className="space-y-3">
            <label className="grid gap-1">
              <span className="text-xs font-medium text-theme-muted"><Tx>余额标签</Tx></span>
              <input
                value={displaySettings.balanceLabel}
                onChange={(e) => setDisplaySettings((prev) => ({ ...prev, balanceLabel: e.target.value }))}
                className="rounded-lg border border-[var(--theme-border)] bg-theme-surface px-3 py-2.5 text-sm text-[var(--theme-text-on-surface)] outline-none"
                placeholder={tText("购物可用返现")}
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-medium text-theme-muted"><Tx>使用说明</Tx></span>
              <textarea
                value={displaySettings.usageNotice}
                onChange={(e) => setDisplaySettings((prev) => ({ ...prev, usageNotice: e.target.value }))}
                rows={3}
                className="rounded-lg border border-[var(--theme-border)] bg-theme-surface px-3 py-2.5 text-sm text-[var(--theme-text-on-surface)] outline-none"
                placeholder={tText("返现金额仅可用于购物，不可提现。")}
              />
            </label>
            <div className="rounded-lg border border-dashed border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))] px-3 py-2.5 text-xs text-theme-muted">
              <p className="font-medium text-[var(--theme-text-on-surface)]">{displaySettings.balanceLabel || tText("购物可用返现")}</p>
              <p className="mt-1">{displaySettings.usageNotice || tText("返现金额仅可用于购物，不可提现。")}</p>
            </div>
            <PermissionGate permission="referral.manage">
              <LoadingButton
                type="button"
                variant="gold"
                state={displaySaving ? "loading" : "normal"}
                loadingText="保存中..."
                onClick={() => void saveDisplaySettings()}
                className="rounded-lg px-4 py-2 text-xs font-semibold"
              ><Tx>保存展示设置</Tx></LoadingButton>
            </PermissionGate>
          </div>
        )}
      </section>

      <div className="space-y-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <SearchBar
              placeholder={tText("搜索订单号 / 昵称 / 手机号...")}
              value={keyword}
              onChange={(v) => { setKeyword(v); setPage(1); }}
            />
          </div>
          <AdminFilterSelect value={status} onChange={(e) => { setStatus(e.target.value as "" | RewardStatus); setPage(1); }} variant="theme">
            {statusOptionsLocalized.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </AdminFilterSelect>
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
        thead={adminTableTheadRow(
          ["用户", "订单号", "层级", "订单金额", "比例", "返现金额", "状态", "备注", "时间"],
          REWARD_COLUMN_ALIGNS,
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
        renderMobileCard={renderMobileCard}
        renderRow={(record) => {
          const label = statusLabels[record.status]
            ? { label: L(statusLabels[record.status].label), className: statusLabels[record.status].className }
            : {
            label: labelRewardStatus(record.status),
            className: "bg-muted text-muted-foreground",
          };
          return (
            <>
              <td className={adminTableCellClass("left")} title={record.user_id || undefined}>
                <p className="text-[var(--theme-text-on-surface)]">
                  {formatUserDisplay(record.user_nickname, record.user_phone)}
                </p>
              </td>
              <td className={adminTableCellClass("left", "font-mono text-xs text-[var(--theme-text-on-surface)]")}>{record.order_no || "—"}</td>
              <td className={adminTableCellClass("right", "text-theme-muted")}>{record.level || 1}</td>
              <td className={adminTableCellClass("right", "text-theme-muted")}>RM {money(record.order_amount)}</td>
              <td className={adminTableCellClass("right", "text-theme-muted")}>{money(record.rate)}%</td>
              <td className={adminTableCellClass("right", "font-semibold text-[var(--theme-price)]")}>RM {money(record.amount)}</td>
              <td className={adminTableCellClass("center")}>
                <span className={`rounded-full px-2 py-1 text-xs ${label.className}`}>{label.label}</span>
              </td>
              <td className={adminTableCellClass("left", "max-w-[14rem]")}>
                <AdminTableCell value={record.remark || "—"} fullText={record.remark || ""} maxWidth="13rem" muted />
              </td>
              <td className={adminTableCellClass("left", "text-xs text-theme-muted")}>
                {record.created_at ? formatDateTime(record.created_at) : "—"}
              </td>
            </>
          );
        }}
      />
    </>
  );

  if (embedded) {
    return <div className="space-y-5">{body}</div>;
  }

  return (
    <AdminPageShell
      hint={<Tx>查看邀请返现入账、冲正和结算状态，用于查账和争议处理</Tx>}
    >
      {body}
    </AdminPageShell>
  );
}

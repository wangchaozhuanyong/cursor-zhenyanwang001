import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatDateTime } from "@/utils/formatDateTime";
import { useSearchParams } from "react-router-dom";
import { Loader2, Star, TrendingDown, TrendingUp, Users } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import { AdminFilterSelect } from "@/components/admin/AdminFilterControls";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { fetchAdminPointsRecords, fetchPointsRules, updatePointsRule } from "@/services/admin/pointsService";
import type { PointsAction, PointsRecord, PointsRule, PointsRuleEditRow, PointsStats } from "@/types/points";
import { toast } from "sonner";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatUserDisplay } from "@/utils/adminDisplayLabels";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { useLocalizedOptions } from "@/hooks/useLocalizedOptions";
import { formatPointsRecordLabel } from "@/utils/pointsDisplayLabels";
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
  buildPointsRecordFilterChips,
  hasActivePointsRecordFilters,
  removePointsRecordFilterChip,
} from "@/utils/adminPointsRecordFilters";
import { THEME_TEXT_DANGER } from "@/utils/themeVisuals";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { useAdminT } from "@/hooks/useAdminT";

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
  register: "注册奖励",
  first_order: "首单奖励",
  order: "下单奖励(旧)",
  order_earn: "订单奖励",
  order_reverse: "订单回滚",
  refund: "退款扣回(旧)",
  sign_in: "每日签到",
  daily_checkin: "每日签到",
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

function normalizePointsRules(data: PointsRule[]): PointsRuleEditRow[] {
  return data.map((r, idx) => ({
    id: String(r.id ?? idx),
    name: String(r.name ?? "积分规则"),
    action: String((r as PointsRule & { action?: string }).action ?? ""),
    points: Number(r.points ?? 0),
    enabled: Boolean(r.enabled ?? true),
  }));
}

export default function AdminPointsRecords({ embedded = false }: { embedded?: boolean }) {
  const { tText } = useAdminT();
  const { pointsAction: labelPointsAction, text: L } = useAdminDisplayLabel();
  const actionOptionsLocalized = useLocalizedOptions(actionOptions);
  const labelPointRuleAction = (action: string) => {
    if (!action) return tText("通用规则");
    return L(actionLabels[action] || "通用规则");
  };
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [keyword, setKeyword] = useState(searchParams.get("userId") || "");
  const [action, setAction] = useState<"" | PointsAction>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [rulesSaving, setRulesSaving] = useState(false);
  const [rules, setRules] = useState<PointsRuleEditRow[]>([]);

  const queryParams = useMemo(() => {
    const looksLikeUserId = keyword.length >= 20 && !keyword.includes(" ");
    return {
      page,
      pageSize,
      keyword: looksLikeUserId ? undefined : keyword,
      userId: looksLikeUserId ? keyword : undefined,
      action: action || undefined,
    };
  }, [action, keyword, page, pageSize]);

  const listQuery = useQuery({
    queryKey: adminQueryKeys.pointsRecords(queryParams),
    queryFn: () => fetchAdminPointsRecords(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const rulesQuery = useQuery({
    queryKey: adminQueryKeys.pointsRules(),
    queryFn: fetchPointsRules,
    staleTime: 60_000,
  });

  const records = listQuery.data?.list ?? [];
  const stats = listQuery.data?.stats ?? emptyStats;
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading && !listQuery.data;
  const rulesLoading = rulesQuery.isLoading && !rulesQuery.data;

  useEffect(() => {
    if (!rulesQuery.data) return;
    setRules(normalizePointsRules(rulesQuery.data));
  }, [rulesQuery.data]);

  const updateRuleField = (id: string, field: "points" | "enabled", value: number | boolean) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };

  const saveRules = async () => {
    setRulesSaving(true);
    try {
      for (const rule of rules) {
        await updatePointsRule(rule.id, { name: rule.name, enabled: rule.enabled, points: rule.points });
      }
      toast.success(tText("积分规则已保存"));
      await queryClient.invalidateQueries({ queryKey: adminQueryKeys.pointsRules() });
    } catch (e) {
      toast.error(toastErrorMessage(e, "保存积分规则失败"));
    } finally {
      setRulesSaving(false);
    }
  };

  const filterState = useMemo(() => ({ keyword, action }), [keyword, action]);
  const filterChips = useMemo(() => buildPointsRecordFilterChips(filterState), [filterState]);
  const filtersActive = hasActivePointsRecordFilters(filterState);
  const emptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.pointsRecordsFiltered : ADMIN_EMPTY_GUIDES.pointsRecords,
  );

  const clearFilters = () => {
    setKeyword("");
    setAction("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removePointsRecordFilterChip(key);
    if ("keyword" in patch) setKeyword(patch.keyword ?? "");
    if ("action" in patch) setAction(patch.action ?? "");
    setPage(1);
  };

  const cards = [
    { label: tText("累计增加"), value: String(intValue(stats.totalEarned)), icon: TrendingUp, className: "text-[var(--theme-price)]" },
    { label: tText("累计扣减/回滚"), value: String(intValue(stats.totalDeducted)), icon: TrendingDown, className: THEME_TEXT_DANGER },
    { label: tText("流水总数"), value: String(intValue(stats.totalRecords)), icon: Star, className: "text-[var(--theme-price)]" },
    { label: tText("涉及用户"), value: String(intValue(stats.activeUsers)), icon: Users, className: "text-[var(--theme-primary)]" },
  ];

  const renderMobileCard = (record: PointsRecord) => {
    const amount = intValue(record.amount);
    return (
      <AdminTableMobileCard>
        <div className="mb-2 flex items-start justify-between gap-2">
          <p className="text-sm font-semibold">{formatUserDisplay(record.user_nickname, record.user_phone)}</p>
          <span className={`shrink-0 text-sm font-semibold ${amount >= 0 ? "text-[var(--theme-price)]" : THEME_TEXT_DANGER}`}>
            {amount > 0 ? "+" : ""}{amount}
          </span>
        </div>
        <div className="mb-2">
          <span className="rounded-full bg-secondary px-2.5 py-1 text-xs">{labelPointsAction(record.action)}</span>
        </div>
        <div className="space-y-2">
          {record.order_no ? (
            <AdminTableMobileCardField label={tText("订单号")}>
              <span className="font-mono text-xs text-muted-foreground">{record.order_no}</span>
            </AdminTableMobileCardField>
          ) : null}
          <AdminTableMobileCardField label={tText("余额变动")}>
            <span className="text-xs text-muted-foreground">{record.balance_before ?? "—"} → {record.balance_after ?? "—"}</span>
          </AdminTableMobileCardField>
          <AdminTableMobileCardField label={tText("说明")}>
            <span className="text-xs text-muted-foreground line-clamp-2">
              {formatPointsRecordLabel({ action: record.action, description: record.description }) || "—"}
            </span>
          </AdminTableMobileCardField>
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
          <h2 className="text-sm font-semibold text-[var(--theme-text-on-surface)]"><Tx>行为奖励规则</Tx></h2>
          <p className="text-xs text-theme-muted"><Tx>签到、首单等行为触发的固定积分奖励；与「全局积分设置」中的消费积分规则不同。修改后点击保存立即生效。</Tx></p>
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
          <div className="py-8 text-center text-sm text-theme-muted"><Tx>暂无积分规则</Tx></div>
        ) : (
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.id} className="flex items-center justify-between rounded-lg border border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))] px-3 py-2.5">
                <div>
                  <p className="text-sm font-medium text-[var(--theme-text-on-surface)]">{rule.name}</p>
                  <p className="text-[11px] text-theme-muted">{labelPointRuleAction(rule.action)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PermissionGate permission="points.manage">
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
              <LoadingButton
                type="button"
                variant="gold"
                state={rulesSaving ? "loading" : "normal"}
                loadingText="保存中..."
                onClick={() => void saveRules()}
                className="rounded-lg px-4 py-2 text-xs font-semibold"
              ><Tx>
                保存积分规则
              </Tx></LoadingButton>
            </PermissionGate>
          </div>
        )}
      </section>

      <div className="space-y-2">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="flex-1">
            <SearchBar
              placeholder={tText("搜索订单号 / 描述 / 昵称 / 手机号...")}
              value={keyword}
              onChange={(v) => { setKeyword(v); setPage(1); }}
            />
          </div>
          <AdminFilterSelect value={action} onChange={(e) => { setAction(e.target.value as "" | PointsAction); setPage(1); }} variant="theme">
            {actionOptionsLocalized.map((opt) => (
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
        skeletonCols={8}
        className="theme-shadow overflow-x-auto rounded-xl border border-[var(--theme-border)] bg-theme-surface"
        tableClassName="w-full min-w-[940px] text-sm"
        theadClassName="border-b border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))]"
        thead={(
          <tr>
            {["用户", "类型", "订单号", "变动", "变动前", "变动后", "说明", "时间"].map((h) => (
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
        renderMobileCard={renderMobileCard}
        renderRow={(record) => {
          const amount = intValue(record.amount);
          return (
            <>
              <td className="px-4 py-3" title={record.user_id || undefined}>
                <p className="text-[var(--theme-text-on-surface)]">
                  {formatUserDisplay(record.user_nickname, record.user_phone)}
                </p>
              </td>
              <td className="px-4 py-3 text-theme-muted">{labelPointsAction(record.action)}</td>
              <td className="px-4 py-3 font-mono text-xs text-[var(--theme-text-on-surface)]">{record.order_no || "—"}</td>
              <td className={`px-4 py-3 font-semibold ${amount >= 0 ? "text-[var(--theme-price)]" : THEME_TEXT_DANGER}`}>
                {amount > 0 ? "+" : ""}{amount}
              </td>
              <td className="px-4 py-3 text-theme-muted">{record.balance_before ?? "—"}</td>
              <td className="px-4 py-3 text-[var(--theme-text-on-surface)]">{record.balance_after ?? "—"}</td>
              <td className="max-w-[16rem] px-4 py-3 align-middle">
                <AdminTableCell
                  value={formatPointsRecordLabel({ action: record.action, description: record.description }) || "—"}
                  fullText={record.description || formatPointsRecordLabel({ action: record.action, description: record.description }) || ""}
                  maxWidth="15rem"
                  muted
                />
              </td>
              <td className="px-4 py-3 text-xs text-theme-muted">
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
      hint={(
        <>
          <p><Tx>
            查看积分发放、扣减、订单退款回滚和管理员调整流水。列表与统计均来自数据库实时查询，无内置演示数据。
          </Tx></p>
          <p className="mt-1"><Tx>
            若需清空联调/演示环境产生的流水，请在备份后使用 server 目录 WIPE_CONFIRM=YES_I_UNDERSTAND node scripts/wipe-business-data.js（会一并清空订单等业务表）；生产环境请勿对单表随意 DELETE，以免积分余额与账本不一致。
          </Tx></p>
        </>
      )}
    >
      {body}
    </AdminPageShell>
  );
}

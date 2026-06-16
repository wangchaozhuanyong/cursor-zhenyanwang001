import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Archive, CheckCircle2, ClipboardCheck, Copy, Eye, PauseCircle, PlayCircle, PlusCircle, Square, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import SearchBar from "@/components/SearchBar";
import * as activityService from "@/services/admin/activityService";
import type { ActivityPrecheckResult, ActivityStatusAction } from "@/services/admin/activityService";
import type { ActivityStatus, ActivityType, MarketingActivity } from "@/types/activity";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatDateTime } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import {
  DISPLAY_POSITION_LABELS,
  normalizeDisplayPositions,
} from "@/constants/marketingDisplayPositions";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { useLocalizedOptions } from "@/hooks/useLocalizedOptions";
import {
  adminTableCellClass,
  adminTableTheadRow,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const ACTIVITY_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "left", "center", "left", "right", "left", "left", "right",
];
import { AdminTableCell, AdminTableCellGroup } from "@/components/admin/AdminTableCell";
import {
  AdminTableMobileCard,
  AdminTableMobileCardField,
} from "@/components/admin/AdminTableMobileCard";
import { AnimatedConfirmDialog, AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useAdminT } from "@/hooks/useAdminT";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import {
  buildActivityFilterChips,
  hasActiveActivityFilters,
  removeActivityFilterChip,
} from "@/utils/adminActivityFilters";
import AdminRowActionsMenu from "@/components/admin/AdminRowActionsMenu";
import { invalidateHomeBootstrapCache } from "@/services/homeService";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";

function getActivityPreviewPath(activity: MarketingActivity) {
  const positions = activity.display_positions || [];
  if (positions.includes("profile_center")) return "/profile";
  if (positions.includes("checkout_notice")) return "/checkout";
  if (positions.includes("cart_notice")) return "/cart";
  return "/";
}

const TABS: Array<{ key: "" | ActivityStatus; label: string }> = [
  { key: "", label: "全部" },
  { key: "active", label: "进行中" },
  { key: "scheduled", label: "未开始" },
  { key: "paused", label: "已暂停" },
  { key: "ended", label: "已结束" },
  { key: "archived", label: "已归档" },
  { key: "disabled", label: "已禁用" },
];

type StatusConfirmState = {
  id: string;
  action: ActivityStatusAction;
  version?: number;
  title: string;
  description: string;
  confirmText: string;
  danger?: boolean;
} | null;

type PrecheckDialogState = {
  activity: MarketingActivity;
  result: ActivityPrecheckResult;
} | null;

function statusActionConfirm(activity: MarketingActivity, action: ActivityStatusAction, tText: (text: string) => string): StatusConfirmState {
  const name = activity.title || tText("该活动");
  const configs: Record<ActivityStatusAction, Omit<NonNullable<StatusConfirmState>, "id" | "action">> = {
    pause: {
      title: tText("暂停活动"),
      description: `${tText("暂停后，活动会立即从前台和结算规则中停止生效。确认暂停「")}${name}${tText("」？")}`,
      confirmText: tText("暂停"),
    },
    end: {
      title: tText("结束活动"),
      description: `${tText("结束后，活动会立即停止生效，未过期时间也不会继续参与结算。确认结束「")}${name}${tText("」？")}`,
      confirmText: tText("结束"),
      danger: true,
    },
    archive: {
      title: tText("归档活动"),
      description: `${tText("归档后，活动将退出运营列表和前台展示，只保留历史记录。确认归档「")}${name}${tText("」？")}`,
      confirmText: tText("归档"),
      danger: true,
    },
    resume: {
      title: tText("恢复活动"),
      description: `${tText("恢复后，系统会按当前时间窗口重新判断未开始或进行中状态。确认恢复「")}${name}${tText("」？")}`,
      confirmText: tText("恢复"),
    },
    disable: {
      title: tText("禁用活动"),
      description: `${tText("禁用后，活动会停止展示和结算命中。确认禁用「")}${name}${tText("」？")}`,
      confirmText: tText("禁用"),
      danger: true,
    },
    enable: {
      title: tText("启用活动"),
      description: `${tText("启用后，系统会按当前时间窗口重新判断活动状态。确认启用「")}${name}${tText("」？")}`,
      confirmText: tText("启用"),
    },
  };
  return { id: activity.id, action, version: activity.version, ...configs[action] };
}

function formatMoney(value: unknown) {
  return `RM ${Number(value || 0).toLocaleString("zh-CN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPercent(value: number | null | undefined) {
  if (value == null || !Number.isFinite(Number(value))) return "--";
  return `${Number(value).toFixed(1)}%`;
}

function riskClass(level: string | undefined) {
  if (level === "limit_reached") return "text-destructive";
  if (level === "limit_warning" || level === "stock_warning") return "text-amber-600";
  return "text-emerald-600";
}

function ActivityEffectSummary({ activity, tText }: { activity: MarketingActivity; tText: (text: string) => string }) {
  const stats = activity.effect_stats;
  if (!stats) return <span className="text-xs text-muted-foreground"><Tx>暂无数据</Tx></span>;
  const usageRate = stats.limit_usage_rate ?? stats.stock_usage_rate;
  return (
    <div className="space-y-1 text-xs text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <span>{tText("订单")} {stats.active_order_count}</span>
        <span>{tText("使用")} {stats.active_usage_count}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{tText("优惠成本")}</span>
        <span className="font-medium text-foreground">{formatMoney(stats.active_discount_amount)}</span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <span>{tText("使用率")} {formatPercent(usageRate)}</span>
        <span className={`font-medium ${riskClass(stats.risk_level)}`}>{tText(stats.risk_label || "正常")}</span>
      </div>
    </div>
  );
}

function ActivityPrecheckSnapshotPanel({ result, tText }: { result: ActivityPrecheckResult; tText: (text: string) => string }) {
  const snapshot = result.snapshot;
  if (!snapshot) return null;
  const positions = snapshot.display_positions?.length ? snapshot.display_positions.join("、") : "--";
  const exclusive = snapshot.exclusive_with?.length ? snapshot.exclusive_with.join("、") : tText("无");
  return (
    <dl className="grid gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-xs text-muted-foreground sm:grid-cols-2">
      <div>
        <dt>{tText("规则版本")}</dt>
        <dd className="mt-0.5 font-medium text-foreground">v{snapshot.rule_version}</dd>
      </div>
      <div>
        <dt>{tText("目标状态")}</dt>
        <dd className="mt-0.5 font-medium text-foreground">{tText(snapshot.target_status)}</dd>
      </div>
      <div>
        <dt>{tText("规则摘要")}</dt>
        <dd className="mt-0.5 font-medium text-foreground">{tText(snapshot.rule_summary)}</dd>
      </div>
      <div>
        <dt>{tText("活动时间")}</dt>
        <dd className="mt-0.5 font-medium text-foreground">{formatDateTime(snapshot.start_at)} - {formatDateTime(snapshot.end_at)}</dd>
      </div>
      <div>
        <dt>{tText("范围 / 商品")}</dt>
        <dd className="mt-0.5 font-medium text-foreground">{snapshot.scope_type} · {tText("范围")} {snapshot.scope_count} · {tText("商品")} {snapshot.item_count}</dd>
      </div>
      <div>
        <dt>{tText("展示位置")}</dt>
        <dd className="mt-0.5 break-words font-medium text-foreground">{positions}</dd>
      </div>
      <div>
        <dt>{tText("叠加")}</dt>
        <dd className="mt-0.5 font-medium text-foreground">{snapshot.stackable ? tText("允许") : tText("不允许")}</dd>
      </div>
      <div>
        <dt>{tText("互斥类型")}</dt>
        <dd className="mt-0.5 break-words font-medium text-foreground">{exclusive}</dd>
      </div>
    </dl>
  );
}

function ActivityPrecheckSummary({ result, tText }: { result: ActivityPrecheckResult; tText: (text: string) => string }) {
  const blocking = result.blocking || [];
  const warnings = result.warnings || [];
  const visibleIssues = blocking.length ? blocking : warnings;
  return (
    <div className="space-y-3 text-left text-sm">
      <div className={`flex items-center gap-2 font-medium ${result.ok ? "text-emerald-600" : "text-destructive"}`}>
        {result.ok ? <CheckCircle2 className="h-4 w-4" aria-hidden /> : <AlertTriangle className="h-4 w-4" aria-hidden />}
        <span>{result.ok ? tText("发布预检通过") : tText("发布预检发现阻断项")}</span>
      </div>
      <ActivityPrecheckSnapshotPanel result={result} tText={tText} />
      {visibleIssues.length ? (
        <ul className="space-y-2">
          {visibleIssues.map((issue, index) => (
            <li key={`${issue.code}-${index}`} className="rounded-lg border border-border bg-secondary/50 p-3">
              <p className="text-sm text-foreground">{tText(issue.message)}</p>
              {issue.conflict_activity_title ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tText("冲突活动")}：{issue.conflict_activity_title}
                  {issue.conflict_family_label ? ` · ${tText(issue.conflict_family_label)}` : ""}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{tText("未发现阻断发布的问题")}</p>
      )}
    </div>
  );
}

export default function AdminActivities() {
  const { tText } = useAdminT();
  const { activityType: labelActivityType } = useAdminDisplayLabel();
  const tabsLocalized = useLocalizedOptions(
    TABS.map((tab) => ({ value: tab.key, label: tab.label })),
  );
  const labelDisplayPositionsLocalized = (positions: string[] | undefined) => {
    const normalized = normalizeDisplayPositions(positions);
    if (!normalized.length) return "--";
    return normalized.map((p) => tText(DISPLAY_POSITION_LABELS[p] || p)).join(tText("、"));
  };
  const adminNavigate = useAdminNavigation();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<ActivityType | "">((searchParams.get("type") as ActivityType | "") || "");
  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [statusConfirm, setStatusConfirm] = useState<StatusConfirmState>(null);
  const [precheckDialog, setPrecheckDialog] = useState<PrecheckDialogState>(null);

  useEffect(() => {
    setType((searchParams.get("type") as ActivityType | "") || "");
    setPage(1);
  }, [searchParams]);

  const queryParams = useMemo(
    () => ({
      page,
      pageSize,
      keyword: keyword || undefined,
      type: type || undefined,
      status: status || undefined,
    }),
    [keyword, page, pageSize, status, type],
  );

  const activitiesQuery = useQuery({
    queryKey: adminQueryKeys.activities(queryParams),
    queryFn: () => activityService.fetchActivities(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
    refetchOnMount: true,
  });

  const activities = activitiesQuery.data?.list ?? [];
  const total = activitiesQuery.data?.total ?? 0;
  const loading = activitiesQuery.isLoading && !activitiesQuery.data;

  const invalidateActivities = async () => {
    invalidateHomeBootstrapCache();
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.activitiesRoot() }),
      queryClient.invalidateQueries({ queryKey: adminQueryKeys.marketingDashboard() }),
    ]);
  };

  const statusActionMutation = useMutation({
    mutationFn: ({ id, action, version }: { id: string; action: ActivityStatusAction; version?: number }) => activityService.updateActivityStatus(id, action, version),
    onSuccess: async () => {
      toast.success(tText("活动状态已更新"));
      setStatusConfirm(null);
      await invalidateActivities();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "更新活动状态失败")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => activityService.deleteActivity(id),
    onSuccess: async () => {
      toast.success(tText("已删除"));
      setDeleteId(null);
      await invalidateActivities();
    },
    onError: (error) => toast.error(toastErrorMessage(error, "删除失败")),
  });

  const precheckMutation = useMutation({
    mutationFn: async (activity: MarketingActivity) => ({
      activity,
      result: await activityService.precheckActivity({}, activity.id),
    }),
    onSuccess: ({ activity, result }) => {
      setPrecheckDialog({ activity, result });
      toast[result.ok ? "success" : "error"](
        result.ok ? tText("发布预检通过") : tText("发布预检发现阻断项"),
      );
    },
    onError: (error) => toast.error(toastErrorMessage(error, "发布预检失败")),
  });

  const copyMutation = useMutation({
    mutationFn: (activity: MarketingActivity) => activityService.copyActivity(activity.id),
    onSuccess: async (copied) => {
      toast.success(tText("已复制为草稿"));
      await invalidateActivities();
      adminNavigate(`/admin/marketing/activities/${copied.id}/edit`);
    },
    onError: (error) => toast.error(toastErrorMessage(error, "复制活动失败")),
  });

  const filterState = useMemo(() => ({ keyword, type, status }), [keyword, type, status]);
  const filterChips = useMemo(() => buildActivityFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveActivityFilters(filterState);
  const activitiesEmptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.activitiesFiltered : ADMIN_EMPTY_GUIDES.activities,
  );

  const clearActivityFilters = () => {
    setKeyword("");
    setType("");
    setStatus("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeActivityFilterChip(key);
    if ("keyword" in patch) setKeyword(patch.keyword ?? "");
    if ("type" in patch) setType(patch.type ?? "");
    if ("status" in patch) setStatus(patch.status ?? "");
    setPage(1);
  };

  const quickButtons = useMemo(() => [
    { label: tText("秒杀"), to: "/admin/marketing/activities/new?type=flash_sale" },
    { label: tText("限时折扣"), to: "/admin/marketing/activities/new?type=limited_time_discount" },
    { label: tText("积分活动"), to: "/admin/marketing/activities/new?type=points_reward" },
  ], [tText]);

  const openPreview = (activity: MarketingActivity) => {
    const path = getActivityPreviewPath(activity);
    window.open(path, "_blank", "noopener,noreferrer");
  };

  const requestStatusAction = (activity: MarketingActivity, action: ActivityStatusAction) => {
    setStatusConfirm(statusActionConfirm(activity, action, tText));
  };

  const requestPrecheck = (activity: MarketingActivity) => {
    precheckMutation.mutate(activity);
  };

  const requestCopy = (activity: MarketingActivity) => {
    copyMutation.mutate(activity);
  };

  const renderMobileCard = (activity: MarketingActivity) => (
    <AdminTableMobileCard>
      <div className="mb-2">
        <p className="line-clamp-2 text-sm font-semibold">{activity.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">{labelActivityType(activity.type)} · {activity.status_label ? tText(activity.status_label) : "-"}</p>
      </div>
      <div className="space-y-2">
        <AdminTableMobileCardField label={tText("活动时间")}>
          <span className="text-xs text-muted-foreground">{formatDateTime(activity.start_at)} — {formatDateTime(activity.end_at)}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("商品/库存")}>
          <span className="text-xs">{tText("商品")} {activity.product_count || 0} · {tText("库存")} {activity.activity_stock_total || 0} · {tText("已售")} {activity.sold_count_total || 0}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("参与数据")}>
          <ActivityEffectSummary activity={activity} tText={tText} />
        </AdminTableMobileCardField>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <UnifiedButton type="button" onClick={() => adminNavigate(`/admin/marketing/activities/${activity.id}/edit`)} className="inline-flex touch-manipulation items-center gap-1 rounded border border-border px-2 py-1.5 text-xs"><Tx>编辑</Tx></UnifiedButton>
        <UnifiedButton type="button" onClick={() => requestCopy(activity)} disabled={copyMutation.isPending} className="inline-flex touch-manipulation items-center gap-1 rounded border border-border px-2 py-1.5 text-xs"><Copy className="h-3.5 w-3.5" aria-hidden /><Tx>复制</Tx></UnifiedButton>
        <UnifiedButton type="button" onClick={() => openPreview(activity)} className="inline-flex touch-manipulation items-center gap-1 rounded border border-border px-2 py-1.5 text-xs"><Eye className="h-3.5 w-3.5" aria-hidden /><Tx>预览</Tx></UnifiedButton>
        <UnifiedButton type="button" onClick={() => adminNavigate(`/admin/reports/activities?activity_id=${encodeURIComponent(activity.id)}`)} className="touch-manipulation rounded border border-border px-2 py-1.5 text-xs"><Tx>查看数据</Tx></UnifiedButton>
        <UnifiedButton type="button" onClick={() => requestPrecheck(activity)} disabled={precheckMutation.isPending} className="inline-flex touch-manipulation items-center gap-1 rounded border border-border px-2 py-1.5 text-xs"><ClipboardCheck className="h-3.5 w-3.5" aria-hidden /><Tx>发布预检</Tx></UnifiedButton>
        {activity.status === "paused" || activity.status === "disabled" || activity.status === "archived" ? (
          <UnifiedButton type="button" onClick={() => requestStatusAction(activity, "resume")} className="inline-flex touch-manipulation items-center gap-1 rounded border border-border px-2 py-1.5 text-xs"><PlayCircle className="h-3.5 w-3.5" aria-hidden /><Tx>恢复</Tx></UnifiedButton>
        ) : (
          <UnifiedButton type="button" onClick={() => requestStatusAction(activity, "pause")} className="inline-flex touch-manipulation items-center gap-1 rounded border border-border px-2 py-1.5 text-xs"><PauseCircle className="h-3.5 w-3.5" aria-hidden /><Tx>暂停</Tx></UnifiedButton>
        )}
        {activity.status !== "ended" && activity.status !== "archived" ? (
          <UnifiedButton type="button" onClick={() => requestStatusAction(activity, "end")} className="inline-flex touch-manipulation items-center gap-1 rounded border border-border px-2 py-1.5 text-xs text-destructive"><Square className="h-3.5 w-3.5" aria-hidden /><Tx>结束</Tx></UnifiedButton>
        ) : null}
        {activity.status !== "archived" ? (
          <UnifiedButton type="button" onClick={() => requestStatusAction(activity, "archive")} className="inline-flex touch-manipulation items-center gap-1 rounded border border-border px-2 py-1.5 text-xs text-destructive"><Archive className="h-3.5 w-3.5" aria-hidden /><Tx>归档</Tx></UnifiedButton>
        ) : null}
        <UnifiedButton type="button" onClick={() => setDeleteId(activity.id)} className="inline-flex touch-manipulation items-center gap-1 rounded border border-border px-2 py-1.5 text-xs text-destructive"><Trash2 className="h-3.5 w-3.5" aria-hidden /><Tx>删除</Tx></UnifiedButton>
      </div>
    </AdminTableMobileCard>
  );

  return (
    <AdminPageShell
      hint={<Tx>活动列表与运营动作入口。</Tx>}
      toolbar={(
        <PermissionGate permission="activity.manage">
          <UnifiedButton type="button" onClick={() => adminNavigate(type ? `/admin/marketing/activities/new?type=${type}` : "/admin/marketing/activities/new")} className="rounded-lg bg-[var(--theme-price)] px-4 py-2.5 text-sm font-semibold text-[var(--theme-price-foreground)]"><PlusCircle className="mr-1 inline h-4 w-4" /><Tx>新建活动</Tx></UnifiedButton>
        </PermissionGate>
      )}
      filters={(
        <>
          <div className="flex flex-wrap gap-2">{quickButtons.map((button) => <UnifiedButton key={button.label} onClick={() => adminNavigate(button.to)} className="rounded-lg border border-border px-3 py-1.5 text-sm">{button.label}</UnifiedButton>)}</div>
          <div className="flex flex-wrap gap-2">{tabsLocalized.map((tab) => <UnifiedButton key={String(tab.value)} type="button" onClick={() => { setStatus(tab.value); setPage(1); }} className={`rounded-lg px-3 py-1.5 text-sm ${status === tab.value ? "bg-[color-mix(in_srgb,var(--theme-price)_15%,var(--theme-surface))] text-theme-price" : "bg-secondary text-muted-foreground"}`}>{tab.label}</UnifiedButton>)}</div>
          <div className="space-y-2">
            <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
              <SearchBar placeholder={tText("搜索活动名称")} value={keyword} onChange={(value) => { setKeyword(value); setPage(1); }} />
              <select value={type} onChange={(e) => { setType(e.target.value as ActivityType | ""); setPage(1); }} className="rounded-lg bg-secondary px-3 py-2 text-sm"><option value=""><Tx>全部类型</Tx></option><option value="campaign"><Tx>普通活动</Tx></option><option value="coupon"><Tx>优惠券活动</Tx></option><option value="flash_sale"><Tx>限时秒杀</Tx></option><option value="limited_time_discount"><Tx>限时折扣</Tx></option><option value="full_reduction"><Tx>满减活动</Tx></option><option value="full_discount"><Tx>满折活动</Tx></option><option value="member_price"><Tx>会员专享</Tx></option><option value="points_reward"><Tx>积分奖励</Tx></option><option value="points_bonus"><Tx>积分活动</Tx></option><option value="checkin_reward"><Tx>签到奖励</Tx></option></select>
              <UnifiedButton type="button" onClick={() => setPage(1)} className="rounded-lg border border-border px-4 py-2 text-sm"><Tx>查询</Tx></UnifiedButton>
            </div>
            <AdminFilterSummaryBar
              chips={filterChips}
              onClearAll={clearActivityFilters}
              onRemove={handleRemoveFilterChip}
            />
          </div>
        </>
      )}
    >
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <AnimatedTable
          loading={loading}
          rows={activities}
          rowKey={(activity: MarketingActivity) => activity.id}
          skeletonRows={6}
          skeletonCols={8}
          className="overflow-x-auto"
          tableClassName="w-full min-w-[1120px] text-sm"
          theadClassName="text-xs text-muted-foreground"
          thead={adminTableTheadRow(
            ["活动名称", "活动类型", "活动状态", "活动时间", "商品/库存/销量", "参与数据", "展示位置", "操作"],
            ACTIVITY_COLUMN_ALIGNS,
            (label) => <Tx>{label}</Tx>,
          )}
          footer={<Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(size) => { setPageSize(size); setPage(1); }} />}
          emptyIcon={activitiesEmptyGuide.icon}
          emptyTitle={activitiesEmptyGuide.title}
          emptyDescription={activitiesEmptyGuide.description}
          emptyAction={(
            <AdminEmptyGuideActions
              guide={activitiesEmptyGuide}
              showClearFilters={filtersActive}
              onClearFilters={clearActivityFilters}
            />
          )}
          renderMobileCard={renderMobileCard}
          renderRow={(activity) => (
            <>
              <td className={adminTableCellClass("left", "max-w-[14rem]")}>
                <AdminTableCellGroup
                  maxWidth="13rem"
                  lines={[
                    { text: activity.title },
                    { text: activity.description || "-", muted: true },
                  ]}
                  tooltipLines={[activity.title, activity.description || "-"]}
                />
              </td>
              <td className={adminTableCellClass("left")}>{labelActivityType(activity.type)}</td>
              <td className={adminTableCellClass("center", "text-xs")}>{activity.status_label ? tText(activity.status_label) : "-"}</td>
              <td className={adminTableCellClass("left", "whitespace-nowrap text-xs text-muted-foreground")}>
                {formatDateTime(activity.start_at)}
                <br />
                {formatDateTime(activity.end_at)}
              </td>
              <td className={adminTableCellClass("right", "text-xs text-muted-foreground")}>
                {tText("商品")} {activity.product_count || 0}
                <br />
                {tText("库存")} {activity.activity_stock_total || 0} / {tText("已售")} {activity.sold_count_total || 0}
              </td>
              <td className={adminTableCellClass("left", "min-w-[12rem]")}>
                <ActivityEffectSummary activity={activity} tText={tText} />
              </td>
              <td className={adminTableCellClass("left", "max-w-[12rem]")}>
                <AdminTableCell
                  value={labelDisplayPositionsLocalized(activity.display_positions)}
                  fullText={labelDisplayPositionsLocalized(activity.display_positions)}
                  maxWidth="11rem"
                  muted
                />
              </td>
              <td className={adminTableCellClass("right")}>
                <AdminRowActionsMenu
                  primary={(
                    <UnifiedButton
                      type="button"
                      onClick={() => adminNavigate(`/admin/marketing/activities/${activity.id}/edit`)}
                      className="inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-secondary"
                    >
                      <Tx>编辑</Tx>
                    </UnifiedButton>
                  )}
                  menuDisabled={statusActionMutation.isPending || precheckMutation.isPending || copyMutation.isPending}
                  moreLabel={<Tx>更多</Tx>}
                  items={[
                    {
                      key: "copy",
                      label: <Tx>复制</Tx>,
                      icon: <Copy className="h-3.5 w-3.5" aria-hidden />,
                      disabled: copyMutation.isPending,
                      onClick: () => requestCopy(activity),
                    },
                    {
                      key: "preview",
                      label: <Tx>预览</Tx>,
                      icon: <Eye className="h-3.5 w-3.5" aria-hidden />,
                      onClick: () => openPreview(activity),
                    },
                    {
                      key: "report",
                      label: <Tx>查看数据</Tx>,
                      onClick: () => adminNavigate(`/admin/reports/activities?activity_id=${encodeURIComponent(activity.id)}`),
                    },
                    {
                      key: "precheck",
                      label: <Tx>发布预检</Tx>,
                      icon: <ClipboardCheck className="h-3.5 w-3.5" aria-hidden />,
                      disabled: precheckMutation.isPending,
                      onClick: () => requestPrecheck(activity),
                    },
                    {
                      key: activity.status === "paused" || activity.status === "disabled" || activity.status === "archived" ? "resume" : "pause",
                      label: <Tx>{activity.status === "paused" || activity.status === "disabled" || activity.status === "archived" ? "恢复" : "暂停"}</Tx>,
                      icon: activity.status === "paused" || activity.status === "disabled" || activity.status === "archived"
                        ? <PlayCircle className="h-3.5 w-3.5" aria-hidden />
                        : <PauseCircle className="h-3.5 w-3.5" aria-hidden />,
                      disabled: statusActionMutation.isPending,
                      onClick: () => requestStatusAction(activity, activity.status === "paused" || activity.status === "disabled" || activity.status === "archived" ? "resume" : "pause"),
                    },
                    {
                      key: "end",
                      label: <Tx>结束</Tx>,
                      icon: <Square className="h-3.5 w-3.5" aria-hidden />,
                      disabled: statusActionMutation.isPending || activity.status === "ended" || activity.status === "archived",
                      onClick: () => requestStatusAction(activity, "end"),
                    },
                    {
                      key: "archive",
                      label: <Tx>归档</Tx>,
                      icon: <Archive className="h-3.5 w-3.5" aria-hidden />,
                      disabled: statusActionMutation.isPending || activity.status === "archived",
                      onClick: () => requestStatusAction(activity, "archive"),
                    },
                    {
                      key: "disable",
                      label: <Tx>禁用</Tx>,
                      disabled: statusActionMutation.isPending || activity.status === "disabled",
                      onClick: () => requestStatusAction(activity, "disable"),
                    },
                    {
                      key: "delete",
                      label: <Tx>删除</Tx>,
                      icon: <Trash2 className="h-3.5 w-3.5" aria-hidden />,
                      danger: true,
                      separatorBefore: true,
                      onClick: () => setDeleteId(activity.id),
                    },
                  ]}
                />
              </td>
            </>
          )}
        />
      </div>

      <AnimatedConfirmDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
        danger
        title={tText("删除活动")}
        description="活动已有参与数据时删除将影响统计，确认删除？"
        confirmText="删除"
        onConfirm={() => {
          if (!deleteId) return;
          deleteMutation.mutate(deleteId);
        }}
      />
      <AnimatedConfirmDialog
        open={!!statusConfirm}
        onOpenChange={(open) => !open && setStatusConfirm(null)}
        danger={!!statusConfirm?.danger}
        title={statusConfirm?.title || ""}
        description={statusConfirm?.description || ""}
        confirmText={statusConfirm?.confirmText || tText("确认")}
        onConfirm={() => {
          if (!statusConfirm) return;
          statusActionMutation.mutate({ id: statusConfirm.id, action: statusConfirm.action, version: statusConfirm.version });
        }}
      />
      <AnimatedConfirmDialog
        open={!!precheckDialog}
        onOpenChange={(open) => !open && setPrecheckDialog(null)}
        danger={!!precheckDialog && !precheckDialog.result.ok}
        title={precheckDialog?.result.ok ? tText("发布预检通过") : tText("发布预检发现阻断项")}
        description={precheckDialog ? (
          <ActivityPrecheckSummary result={precheckDialog.result} tText={tText} />
        ) : null}
        confirmText={tText("知道了")}
        cancelText={tText("关闭")}
        onConfirm={() => setPrecheckDialog(null)}
      />
    </AdminPageShell>
  );
}

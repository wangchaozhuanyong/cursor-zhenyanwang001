import { useEffect, useMemo, useState } from "react";
import { Copy, Eye, PlusCircle, Trash2 } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import SearchBar from "@/components/SearchBar";
import * as activityService from "@/services/admin/activityService";
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
  { key: "ended", label: "已结束" },
  { key: "disabled", label: "已禁用" },
];

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

  const toggleDisabledMutation = useMutation({
    mutationFn: ({ id, disabled }: { id: string; disabled: boolean }) => activityService.setActivityDisabled(id, disabled),
    onSuccess: async () => {
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
    { label: tText("满减"), to: "/admin/marketing/activities/new?type=full_reduction" },
    { label: tText("积分活动"), to: "/admin/marketing/activities/new?type=points_bonus" },
  ], [tText]);

  const openPreview = (activity: MarketingActivity) => {
    const path = getActivityPreviewPath(activity);
    window.open(path, "_blank", "noopener,noreferrer");
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
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <UnifiedButton type="button" onClick={() => adminNavigate(`/admin/marketing/activities/${activity.id}/edit`)} className="touch-manipulation rounded border border-border px-2 py-1.5 text-xs"><Tx>编辑</Tx></UnifiedButton>
        <UnifiedButton type="button" onClick={() => adminNavigate(`/admin/reports/activities?activity_id=${encodeURIComponent(activity.id)}`)} className="touch-manipulation rounded border border-border px-2 py-1.5 text-xs"><Tx>查看数据</Tx></UnifiedButton>
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
              <select value={type} onChange={(e) => { setType(e.target.value as ActivityType | ""); setPage(1); }} className="rounded-lg bg-secondary px-3 py-2 text-sm"><option value=""><Tx>全部类型</Tx></option><option value="flash_sale"><Tx>限时秒杀</Tx></option><option value="full_reduction"><Tx>满减活动</Tx></option><option value="points_bonus"><Tx>积分活动</Tx></option></select>
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
              <td className={adminTableCellClass("left", "text-xs text-muted-foreground")}><Tx>点击“查看数据”进入活动分析</Tx></td>
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
                  menuDisabled={toggleDisabledMutation.isPending}
                  moreLabel={<Tx>更多</Tx>}
                  items={[
                    {
                      key: "copy",
                      label: <Tx>复制</Tx>,
                      icon: <Copy className="h-3.5 w-3.5" aria-hidden />,
                      onClick: () => adminNavigate(`/admin/marketing/activities/new?copy_from=${activity.id}`),
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
                      key: "toggle",
                      label: <Tx>{activity.status === "disabled" ? "启用" : "禁用"}</Tx>,
                      disabled: toggleDisabledMutation.isPending,
                      onClick: () => toggleDisabledMutation.mutate({ id: activity.id, disabled: activity.status !== "disabled" }),
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
    </AdminPageShell>
  );
}

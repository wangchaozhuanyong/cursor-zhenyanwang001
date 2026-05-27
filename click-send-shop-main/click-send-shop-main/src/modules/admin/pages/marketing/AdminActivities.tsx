import { useMemo, useState } from "react";
import { Copy, Eye, PlusCircle, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import SearchBar from "@/components/SearchBar";
import * as activityService from "@/services/admin/activityService";
import type { ActivityStatus, ActivityType, MarketingActivity } from "@/types/activity";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { formatAdminDateTime } from "@/utils/formatDateTime";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import { THEME_OUTLINE_DANGER } from "@/utils/themeVisuals";
import {
  DISPLAY_POSITION_LABELS,
  normalizeDisplayPositions,
} from "@/constants/marketingDisplayPositions";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { useLocalizedOptions } from "@/hooks/useLocalizedOptions";
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState("");
  const [type, setType] = useState<ActivityType | "">("");
  const [status, setStatus] = useState<ActivityStatus | "">("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deleteId, setDeleteId] = useState<string | null>(null);

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

  const invalidateActivities = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.activitiesRoot() });

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
    { label: tText("优惠券"), to: "/admin/marketing/coupons/new" },
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
          <span className="text-xs text-muted-foreground">{formatAdminDateTime(activity.start_at)} — {formatAdminDateTime(activity.end_at)}</span>
        </AdminTableMobileCardField>
        <AdminTableMobileCardField label={tText("商品/库存")}>
          <span className="text-xs">{tText("商品")} {activity.product_count || 0} · {tText("库存")} {activity.activity_stock_total || 0} · {tText("已售")} {activity.sold_count_total || 0}</span>
        </AdminTableMobileCardField>
      </div>
      <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
        <button type="button" onClick={() => navigate(`/admin/marketing/activities/${activity.id}/edit`)} className="touch-manipulation rounded border border-border px-2 py-1.5 text-xs"><Tx>编辑</Tx></button>
        <button type="button" onClick={() => navigate(`/admin/reports/activities?activity_id=${encodeURIComponent(activity.id)}`)} className="touch-manipulation rounded border border-border px-2 py-1.5 text-xs"><Tx>查看数据</Tx></button>
      </div>
    </AdminTableMobileCard>
  );

  return (
    <AdminPageShell
      hint={<Tx>活动列表与运营动作入口。</Tx>}
      toolbar={(
        <PermissionGate permission="activity.manage">
          <button type="button" onClick={() => navigate("/admin/marketing/activities/new")} className="rounded-lg bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground"><PlusCircle className="mr-1 inline h-4 w-4" /><Tx>新建活动</Tx></button>
        </PermissionGate>
      )}
      filters={(
        <>
          <div className="flex flex-wrap gap-2">{quickButtons.map((button) => <button key={button.label} onClick={() => navigate(button.to)} className="rounded-lg border border-border px-3 py-1.5 text-sm">{button.label}</button>)}</div>
          <div className="flex flex-wrap gap-2">{tabsLocalized.map((tab) => <button key={String(tab.value)} type="button" onClick={() => { setStatus(tab.value); setPage(1); }} className={`rounded-lg px-3 py-1.5 text-sm ${status === tab.value ? "bg-gold/15 text-theme-price" : "bg-secondary text-muted-foreground"}`}>{tab.label}</button>)}</div>
          <div className="space-y-2">
            <div className="grid gap-3 md:grid-cols-[1fr_160px_auto]">
              <SearchBar placeholder={tText("搜索活动名称")} value={keyword} onChange={(value) => { setKeyword(value); setPage(1); }} />
              <select value={type} onChange={(e) => { setType(e.target.value as ActivityType | ""); setPage(1); }} className="rounded-lg bg-secondary px-3 py-2 text-sm"><option value=""><Tx>全部类型</Tx></option><option value="flash_sale"><Tx>限时秒杀</Tx></option><option value="full_reduction"><Tx>满减活动</Tx></option></select>
              <button type="button" onClick={() => setPage(1)} className="rounded-lg border border-border px-4 py-2 text-sm"><Tx>查询</Tx></button>
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
          thead={(
            <tr>
              <th className="px-4 py-3 text-left"><Tx>活动名称</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>活动类型</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>活动状态</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>活动时间</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>商品/库存/销量</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>参与数据</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>展示位置</Tx></th>
              <th className="px-4 py-3 text-left"><Tx>操作</Tx></th>
            </tr>
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
              <td className="max-w-[14rem] px-4 py-3 align-middle">
                <AdminTableCellGroup
                  maxWidth="13rem"
                  lines={[
                    { text: activity.title },
                    { text: activity.description || "-", muted: true },
                  ]}
                  tooltipLines={[activity.title, activity.description || "-"]}
                />
              </td>
              <td className="px-4 py-3">{labelActivityType(activity.type)}</td>
              <td className="px-4 py-3 text-xs">{activity.status_label ? tText(activity.status_label) : "-"}</td>
              <td className="px-4 py-3 whitespace-nowrap text-xs text-muted-foreground">
                {formatAdminDateTime(activity.start_at)}
                <br />
                {formatAdminDateTime(activity.end_at)}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground">
                {tText("商品")} {activity.product_count || 0}
                <br />
                {tText("库存")} {activity.activity_stock_total || 0} / {tText("已售")} {activity.sold_count_total || 0}
              </td>
              <td className="px-4 py-3 text-xs text-muted-foreground"><Tx>点击“查看数据”进入活动分析</Tx></td>
              <td className="max-w-[12rem] px-4 py-3 align-middle">
                <AdminTableCell
                  value={labelDisplayPositionsLocalized(activity.display_positions)}
                  fullText={labelDisplayPositionsLocalized(activity.display_positions)}
                  maxWidth="11rem"
                  muted
                />
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2 text-xs">
                  <button type="button" onClick={() => navigate(`/admin/marketing/activities/${activity.id}/edit`)} className="rounded border border-border px-2 py-1"><Tx>编辑</Tx></button>
                  <button type="button" onClick={() => navigate(`/admin/marketing/activities/new?copy_from=${activity.id}`)} className="rounded border border-border px-2 py-1"><Copy className="mr-1 inline h-3 w-3" /><Tx>复制</Tx></button>
                  <button type="button" onClick={() => openPreview(activity)} className="rounded border border-border px-2 py-1"><Eye className="mr-1 inline h-3 w-3" /><Tx>预览</Tx></button>
                  <button type="button" onClick={() => navigate(`/admin/reports/activities?activity_id=${encodeURIComponent(activity.id)}`)} className="rounded border border-border px-2 py-1"><Tx>查看数据</Tx></button>
                  <button
                    type="button"
                    disabled={toggleDisabledMutation.isPending}
                    onClick={() => toggleDisabledMutation.mutate({ id: activity.id, disabled: activity.status !== "disabled" })}
                    className="rounded border border-border px-2 py-1"
                  >
                    {activity.status === "disabled" ? "启用" : "禁用"}
                  </button>
                  <button type="button" onClick={() => setDeleteId(activity.id)} className={`rounded border px-2 py-1 ${THEME_OUTLINE_DANGER}`}><Trash2 className="mr-1 inline h-3 w-3" /><Tx>删除</Tx></button>
                </div>
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

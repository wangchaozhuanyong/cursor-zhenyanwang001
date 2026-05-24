import { formatDateTime } from "@/utils/formatDateTime";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, Loader2, Archive } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { toast } from "sonner";
import { Tx } from "@/components/admin/AdminText";
import {
  loadRecycleBin,
  permanentlyDeleteRecycleBinItem,
  restoreRecycleBinItem,
} from "@/services/admin/recycleBinService";
import type { RecycleBinItem } from "@/services/admin/recycleBinService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { RECYCLE_TYPE_FILTER_OPTIONS } from "@/utils/adminDisplayLabels";
import { useAdminDisplayLabel } from "@/hooks/useAdminDisplayLabel";
import { useLocalizedOptions } from "@/hooks/useLocalizedOptions";
import { formatRecycleBinItemFullText, formatRecycleBinItemName } from "@/utils/recycleBinDisplay";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import {
  buildRecycleBinFilterChips,
  hasActiveRecycleBinFilters,
  removeRecycleBinFilterChip,
} from "@/utils/adminRecycleBinFilters";
import {
  THEME_BADGE_ACCENT,
  THEME_BADGE_DANGER,
  THEME_BADGE_PRICE,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
  THEME_TEXT_SUCCESS_SOFT,
  THEME_TEXT_DANGER,
  THEME_BORDER_DANGER_SOFT,
  THEME_HOVER_BG_DANGER,
} from "@/utils/themeVisuals";
import { useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { useAdminT } from "@/hooks/useAdminT";

const TYPE_BADGE: Record<string, string> = {
  products: THEME_BADGE_PRIMARY,
  categories: THEME_BADGE_ACCENT,
  coupons: THEME_BADGE_SUCCESS,
  banners: THEME_BADGE_WARNING,
  content_pages: THEME_BADGE_PRICE,
  product_reviews: THEME_BADGE_DANGER,
  marketing_activities: THEME_BADGE_SUCCESS,
  product_tags: THEME_BADGE_ACCENT,
  notifications: THEME_BADGE_PRIMARY,
  notification_batches: THEME_BADGE_PRIMARY,
  product_variants: THEME_BADGE_PRIMARY,
  product_spec_groups: THEME_BADGE_ACCENT,
  product_spec_values: THEME_BADGE_ACCENT,
  inventory_pack_rules: THEME_BADGE_WARNING,
  users: "bg-muted text-muted-foreground",
};

export default function AdminRecycleBin() {
  const { tText } = useAdminT();
  const { recycleType: labelRecycleType } = useAdminDisplayLabel();
  const typeFilterOptions = useLocalizedOptions(RECYCLE_TYPE_FILTER_OPTIONS);
  const queryClient = useQueryClient();
  const { confirm } = useAdminConfirm();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState("");

  const queryParams = useMemo(
    () => ({ ...(typeFilter ? { type: typeFilter } : {}), page, pageSize }),
    [page, pageSize, typeFilter],
  );

  const listQuery = useQuery({
    queryKey: adminQueryKeys.recycleBin(queryParams),
    queryFn: () => loadRecycleBin(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const items = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading && !listQuery.data;

  const invalidateRecycleBin = async (itemType?: string) => {
    const tasks = [queryClient.invalidateQueries({ queryKey: adminQueryKeys.recycleBinRoot() })];
    if (itemType === "products") {
      tasks.push(
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.productsRoot() }),
        queryClient.invalidateQueries({ queryKey: adminQueryKeys.inventoryRoot() }),
      );
    }
    await Promise.all(tasks);
  };

  const filterState = useMemo(() => ({ typeFilter }), [typeFilter]);
  const filterChips = useMemo(() => buildRecycleBinFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveRecycleBinFilters(filterState);
  const emptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.recycleBinFiltered : ADMIN_EMPTY_GUIDES.recycleBin,
  );

  const clearFilters = () => {
    setTypeFilter("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeRecycleBinFilterChip(key);
    if ("typeFilter" in patch) setTypeFilter(patch.typeFilter ?? "");
    setPage(1);
  };

  const restoreMutation = useMutation({
    mutationFn: (item: RecycleBinItem) => restoreRecycleBinItem(item.id, item.type),
    onSuccess: async (_data, item) => {
      toast.success(tText("已恢复"));
      await invalidateRecycleBin(item.type);
    },
    onError: (e) => toast.error(toastErrorMessage(e, "恢复失败")),
  });

  const confirmPermanentDelete = (item: RecycleBinItem) => {
    confirm({ title: tText("确认彻底删除"),
      description: (
        <>
          此操作不可恢复！
          <br />
          {labelRecycleType(item.type, item.type_label)}：{formatRecycleBinItemName(item)}
        </>
      ),
      confirmText: "确认删除",
      danger: true,
      onConfirm: async () => {
        await permanentlyDeleteRecycleBinItem(item.id, item.type);
        toast.success(tText("已彻底删除"));
        await invalidateRecycleBin(item.type);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Archive size={20} className="text-muted-foreground" />
            <h2 className="text-lg font-bold text-foreground"><Tx>回收站</Tx></h2>
          </div>
          <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
            {typeFilterOptions.map((o) => <option key={o.value || "__all"} value={o.value}>{o.label}</option>)}
          </select>
        </div>
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearFilters} onRemove={handleRemoveFilterChip} />
      </div>

      {!loading && items.length === 0 ? (
        <div className="py-16 text-center">
          <Trash2 size={40} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground"><Tx>回收站为空</Tx></p>
        </div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex gap-3">
                    <div className="skeleton-base skeleton-shimmer h-12 w-12 shrink-0 rounded-lg" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="skeleton-base skeleton-shimmer h-4 w-20 rounded-full" />
                      <div className="skeleton-base skeleton-shimmer h-4 w-3/4 rounded" />
                    </div>
                  </div>
                </div>
              ))
              : null}
            {!loading && items.map((item) => (
              <div key={`${item.type}-${item.id}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {item.cover_image && <img src={item.cover_image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[item.type] || "bg-muted text-muted-foreground"}`}>
                        {labelRecycleType(item.type, item.type_label)}
                      </span>
                    </div>
                    <AdminTableCell
                      value={formatRecycleBinItemName(item)}
                      fullText={formatRecycleBinItemFullText(item)}
                      maxWidth="100%"
                    />
                    <p className="text-[11px] text-muted-foreground">删除时间: {item.deleted_at ? formatDateTime(item.deleted_at) : "—"}</p>
                    <PermissionGate permission="recycle_bin.manage">
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => restoreMutation.mutate(item)} className={`touch-manipulation min-h-[40px] flex-1 rounded-lg border border-[var(--theme-border)] py-1.5 text-xs ${THEME_TEXT_SUCCESS_SOFT} hover:bg-[var(--theme-bg)]`}>
                          <RotateCcw size={12} className="mr-1 inline" /><Tx>恢复
                        </Tx></button>
                        <button type="button" onClick={() => confirmPermanentDelete(item)} className={`touch-manipulation min-h-[40px] flex-1 rounded-lg border py-1.5 text-xs ${THEME_BORDER_DANGER_SOFT} ${THEME_TEXT_DANGER} ${THEME_HOVER_BG_DANGER}`}>
                          <Trash2 size={12} className="mr-1 inline" /><Tx>彻底删除
                        </Tx></button>
                      </div>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            ))}
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </div>

          <div className="hidden md:block rounded-xl border border-border bg-card">
            <AnimatedTable
              embedded
              loading={loading}
              rows={items}
              rowKey={(item) => `${item.type}-${item.id}`}
              skeletonRows={8}
              skeletonCols={4}
              tableClassName="w-full min-w-[600px] text-sm"
              theadClassName="border-b border-border bg-secondary/50"
              thead={(
                <tr>
                  {["类型", "名称", "删除时间", "操作"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              )}
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
              renderRow={(item) => (
                <>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[item.type] || "bg-muted text-muted-foreground"}`}>
                      {labelRecycleType(item.type, item.type_label)}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {item.cover_image && <img src={item.cover_image} alt="" className="h-8 w-8 rounded object-cover" />}
                      <AdminTableCell
                        value={formatRecycleBinItemName(item)}
                        fullText={formatRecycleBinItemFullText(item)}
                        maxWidth="12.5rem"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{item.deleted_at ? formatDateTime(item.deleted_at) : "—"}</td>
                  <td className="px-4 py-3">
                    <PermissionGate permission="recycle_bin.manage">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => restoreMutation.mutate(item)} className={`touch-manipulation rounded-lg border border-[var(--theme-border)] p-1.5 ${THEME_TEXT_SUCCESS_SOFT} hover:bg-[var(--theme-bg)]`} title={tText("恢复")}>
                          <RotateCcw size={14} />
                        </button>
                        <button type="button" onClick={() => confirmPermanentDelete(item)} className={`touch-manipulation rounded-lg border p-1.5 ${THEME_BORDER_DANGER_SOFT} ${THEME_TEXT_DANGER} ${THEME_HOVER_BG_DANGER}`} title={tText("彻底删除")}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </PermissionGate>
                  </td>
                </>
              )}
            />
            {(loading || items.length > 0) && (
              <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
            )}
          </div>
        </>
      )}
    </div>
  );
}

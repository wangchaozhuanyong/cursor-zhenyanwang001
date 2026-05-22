import { formatDateTime } from "@/utils/formatDateTime";
import { useState, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Trash2, RotateCcw, Loader2, AlertTriangle, Archive } from "lucide-react";
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
import { labelRecycleType } from "@/utils/adminDisplayLabels";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
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
  THEME_BTN_DANGER_SOLID,
} from "@/utils/themeVisuals";

const TYPE_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "products", label: "商品" },
  { value: "categories", label: "分类" },
  { value: "coupons", label: "优惠券" },
  { value: "banners", label: "Banner" },
  { value: "content_pages", label: "内容页" },
  { value: "product_reviews", label: "评论" },
  { value: "marketing_activities", label: "营销活动" },
  { value: "product_tags", label: "商品标签" },
  { value: "notifications", label: "通知" },
  { value: "notification_batches", label: "通知批次" },
  { value: "product_variants", label: "商品规格" },
  { value: "product_spec_groups", label: "规格组" },
  { value: "product_spec_values", label: "规格值" },
  { value: "inventory_pack_rules", label: "组装拆包规则" },
  { value: "users", label: "用户" },
];

const TYPE_BADGE: Record<string, string> = {
  products: THEME_BADGE_PRIMARY,
  categories: THEME_BADGE_ACCENT,
  coupons: THEME_BADGE_SUCCESS,
  banners: THEME_BADGE_WARNING,
  content_pages: THEME_BADGE_PRICE,
  product_reviews: THEME_BADGE_DANGER,
};

export default function AdminRecycleBin() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [typeFilter, setTypeFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<RecycleBinItem | null>(null);

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

  const invalidateRecycleBin = () => queryClient.invalidateQueries({ queryKey: adminQueryKeys.recycleBinRoot() });

  const filterState = useMemo(() => ({ typeFilter }), [typeFilter]);
  const filterChips = useMemo(() => buildRecycleBinFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveRecycleBinFilters(filterState);
  const emptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.recycleBinFiltered : ADMIN_EMPTY_GUIDES.recycleBin;

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
    onSuccess: async () => {
      toast.success("已恢复");
      await invalidateRecycleBin();
    },
    onError: (e) => toast.error(toastErrorMessage(e, "恢复失败")),
  });

  const handlePermanentDelete = async () => {
    if (!confirmDelete) return;
    try {
      await permanentlyDeleteRecycleBinItem(confirmDelete.id, confirmDelete.type);
      toast.success("已彻底删除");
      setConfirmDelete(null);
      await invalidateRecycleBin();
    } catch (e) { toast.error(toastErrorMessage(e, "删除失败")); }
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
            {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                      value={item.name || item.id}
                      fullText={item.name ? `${item.name}\n${item.id}` : item.id}
                      maxWidth="100%"
                    />
                    <p className="text-[11px] text-muted-foreground">删除时间: {item.deleted_at ? formatDateTime(item.deleted_at) : "—"}</p>
                    <PermissionGate permission="recycle_bin.manage">
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => restoreMutation.mutate(item)} className={`touch-manipulation min-h-[40px] flex-1 rounded-lg border border-[var(--theme-border)] py-1.5 text-xs ${THEME_TEXT_SUCCESS_SOFT} hover:bg-[var(--theme-bg)]`}>
                          <RotateCcw size={12} className="mr-1 inline" /><Tx>恢复
                        </Tx></button>
                        <button type="button" onClick={() => setConfirmDelete(item)} className={`touch-manipulation min-h-[40px] flex-1 rounded-lg border py-1.5 text-xs ${THEME_BORDER_DANGER_SOFT} ${THEME_TEXT_DANGER} ${THEME_HOVER_BG_DANGER}`}>
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
                        value={item.name || item.id}
                        fullText={item.name ? `${item.name}\n${item.id}` : item.id}
                        maxWidth="12.5rem"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{item.deleted_at ? formatDateTime(item.deleted_at) : "—"}</td>
                  <td className="px-4 py-3">
                    <PermissionGate permission="recycle_bin.manage">
                      <div className="flex gap-1">
                        <button type="button" onClick={() => restoreMutation.mutate(item)} className={`touch-manipulation rounded-lg border border-[var(--theme-border)] p-1.5 ${THEME_TEXT_SUCCESS_SOFT} hover:bg-[var(--theme-bg)]`} title="恢复">
                          <RotateCcw size={14} />
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(item)} className={`touch-manipulation rounded-lg border p-1.5 ${THEME_BORDER_DANGER_SOFT} ${THEME_TEXT_DANGER} ${THEME_HOVER_BG_DANGER}`} title="彻底删除">
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
      {/* Permanent delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4 text-center">
            <AlertTriangle size={40} className={`mx-auto ${THEME_TEXT_DANGER}`} />
            <h3 className="font-bold text-foreground"><Tx>确认彻底删除</Tx></h3>
            <p className="text-sm text-muted-foreground"><Tx>此操作不可恢复！</Tx><br />{confirmDelete.type_label}: {confirmDelete.name}</p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary"><Tx>取消</Tx></button>
              <button type="button" onClick={handlePermanentDelete} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${THEME_BTN_DANGER_SOLID}`}><Tx>确认删除</Tx></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

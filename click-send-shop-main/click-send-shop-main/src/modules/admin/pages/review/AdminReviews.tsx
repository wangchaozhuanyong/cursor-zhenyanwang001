import { formatDateTime } from "@/utils/formatDateTime";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Star, Eye, EyeOff, Trash2, RotateCcw, MessageSquare, AlertTriangle, Sparkles, Check, XCircle, Info } from "lucide-react";
import AdminReviewDetailDialog from "@/modules/admin/pages/review/AdminReviewDetailDialog";
import type { ReviewDetailPayload, ComplaintStatus } from "@/services/admin/reviewService";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { toast } from "sonner";
import * as reviewService from "@/services/admin/reviewService";
import type { AdminReview, ReviewListParams } from "@/services/admin/reviewService";
import { adminQueryKeys } from "@/lib/adminQueryKeys";
import { toastErrorMessage } from "@/utils/errorMessage";
import { AdminTableCell } from "@/components/admin/AdminTableCell";
import { AnimatedTable } from "@/modules/micro-interactions";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import {
  buildReviewFilterChips,
  hasActiveReviewFilters,
  removeReviewFilterChip,
} from "@/utils/adminReviewFilters";
import { Tx } from "@/components/admin/AdminText";
import { adminConfirmDelete, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import {
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
  THEME_OUTLINE_SUCCESS,
  THEME_OUTLINE_WARNING,
  THEME_TEXT_SUCCESS_SOFT,
  THEME_STAR_FILLED,
  THEME_TEXT_DANGER,
  THEME_HOVER_TEXT_DANGER,
  THEME_BORDER_DANGER_SOFT,
  THEME_HOVER_BG_DANGER,
  THEME_BTN_DANGER_SOLID,
} from "@/utils/themeVisuals";

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "pending", label: "待审核" },
  { value: "normal", label: "正常" },
  { value: "hidden", label: "已隐藏" },
  { value: "rejected", label: "已拒绝" },
  { value: "deleted", label: "已删除" },
];

const COMPLAINT_OPTIONS = [
  { value: "", label: "差评处理" },
  { value: "pending", label: "未处理" },
  { value: "in_progress", label: "处理中" },
  { value: "contacted", label: "已联系" },
  { value: "resolved", label: "已解决" },
  { value: "dismissed", label: "无需处理" },
];

const REVIEW_VIEW = ["review.view", "review.manage"];
const REVIEW_REPLY = ["review.reply", "review.manage"];
const REVIEW_MODERATE = ["review.moderate", "review.manage"];
const REVIEW_FEATURE = ["review.feature", "review.manage"];
const REVIEW_DELETE = ["review.delete", "review.manage"];

const RATING_OPTIONS = [
  { value: 0, label: "全部星级" },
  { value: 5, label: "5 星" },
  { value: 4, label: "4 星" },
  { value: 3, label: "3 星" },
  { value: 2, label: "2 星" },
  { value: 1, label: "1 星" },
];

const STATUS_BADGE: Record<string, { cls: string; text: string }> = {
  pending: { cls: THEME_BADGE_PRIMARY, text: "待审核" },
  normal: { cls: THEME_BADGE_SUCCESS, text: "正常" },
  hidden: { cls: THEME_BADGE_WARNING, text: "已隐藏" },
  rejected: { cls: THEME_BADGE_WARNING, text: "已拒绝" },
  deleted: { cls: THEME_BADGE_DANGER, text: "已删除" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} className={i < rating ? THEME_STAR_FILLED : "text-muted-foreground/30"} />
      ))}
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-xl border border-border bg-card p-4">
      <div className="flex gap-3">
        <div className="h-10 w-10 rounded-full bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-1/3 rounded bg-muted" />
          <div className="h-3 w-2/3 rounded bg-muted" />
          <div className="h-3 w-1/2 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

export default function AdminReviews() {
  const { confirm } = useAdminConfirm();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [complaintStatus, setComplaintStatus] = useState("");
  const [rating, setRating] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [replyTarget, setReplyTarget] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; permanent: boolean } | null>(null);
  const [detail, setDetail] = useState<ReviewDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [complaintTarget, setComplaintTarget] = useState<AdminReview | null>(null);
  const [complaintForm, setComplaintForm] = useState<{ status: ComplaintStatus; note: string }>({ status: "pending", note: "" });

  const queryParams = useMemo(() => {
    const params: ReviewListParams = { page, pageSize, sortBy: "created_at", sortOrder: "DESC" };
    if (keyword) params.keyword = keyword;
    if (status) {
      params.status = status;
      if (status === "deleted") params.includeDeleted = "true";
    }
    if (rating) params.rating = rating;
    if (complaintStatus) params.complaintStatus = complaintStatus;
    return params;
  }, [page, pageSize, keyword, status, rating, complaintStatus]);

  const listQuery = useQuery({
    queryKey: adminQueryKeys.reviews(queryParams),
    queryFn: () => reviewService.fetchReviews(queryParams),
    placeholderData: (previous) => previous,
    staleTime: 60_000,
  });

  const reviews = listQuery.data?.list ?? [];
  const total = listQuery.data?.total ?? 0;
  const loading = listQuery.isLoading && !listQuery.data;
  const error = listQuery.isError ? toastErrorMessage(listQuery.error, "加载评论失败") : null;

  const invalidateReviews = () =>
    queryClient.invalidateQueries({ queryKey: adminQueryKeys.reviewsRoot() });

  const openDetail = async (id: string) => {
    setDetailLoading(true);
    setDetail(null);
    try {
      const data = await reviewService.fetchReviewDetail(id);
      setDetail(data);
    } catch (e) {
      toast.error(toastErrorMessage(e, "加载详情失败"));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      await reviewService.approveReview(id);
      toast.success("已通过审核");
      void invalidateReviews();
      if (detail?.review.id === id) openDetail(id);
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleReject = async (id: string) => {
    try {
      await reviewService.rejectReview(id);
      toast.success("已拒绝");
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleSaveComplaint = async () => {
    if (!complaintTarget) return;
    try {
      await reviewService.updateComplaint(complaintTarget.id, complaintForm.status, complaintForm.note.trim() || undefined);
      toast.success("差评处理已更新");
      setComplaintTarget(null);
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "保存失败")); }
  };

  const filterState = useMemo(() => ({ keyword, status, rating, complaintStatus }), [keyword, status, rating, complaintStatus]);
  const filterChips = useMemo(() => buildReviewFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveReviewFilters(filterState);
  const reviewsEmptyGuide = filtersActive ? ADMIN_EMPTY_GUIDES.reviewsFiltered : ADMIN_EMPTY_GUIDES.reviews;

  const clearReviewFilters = () => {
    setKeyword("");
    setStatus("");
    setRating(0);
    setComplaintStatus("");
    setPage(1);
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeReviewFilterChip(key);
    if ("keyword" in patch) setKeyword(patch.keyword ?? "");
    if ("status" in patch) setStatus(patch.status ?? "");
    if ("rating" in patch) setRating(patch.rating ?? 0);
    if ("complaintStatus" in patch) setComplaintStatus(patch.complaintStatus ?? "");
    setPage(1);
  };

  const handleToggle = async (id: string) => {
    try {
      await reviewService.toggleVisibility(id);
      toast.success("状态已更新");
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      await reviewService.toggleFeatured(id);
      toast.success("精选状态已更新");
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleDelete = async (id: string) => {
    try {
      await reviewService.deleteReview(id);
      toast.success("已删除");
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "删除失败")); }
  };

  const handleRestore = async (id: string) => {
    try {
      await reviewService.restoreReview(id);
      toast.success("已恢复");
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "恢复失败")); }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await reviewService.permanentDeleteReview(id);
      toast.success("已彻底删除");
      setConfirmDelete(null);
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "删除失败")); }
  };

  const handleReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    try {
      await reviewService.replyReview(replyTarget.id, replyText.trim());
      toast.success("回复成功");
      setReplyTarget(null);
      setReplyText("");
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "回复失败")); }
  };

  const handleBatchHide = async () => {
    try {
      await reviewService.batchHide(selected);
      toast.success(`已隐藏 ${selected.length} 条评论`);
      setSelected([]);
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleBatchDelete = async () => {
    try {
      await reviewService.batchDelete(selected);
      toast.success(`已删除 ${selected.length} 条评论`);
      setSelected([]);
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const toggleAll = () => {
    if (selected.length === reviews.length) setSelected([]);
    else setSelected(reviews.map((r) => r.id));
  };

  if (error && !loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle size={32} />
        <p>{error}</p>
        <button type="button" onClick={() => void listQuery.refetch()} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"><Tx>重试</Tx></button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <SearchBar placeholder="搜索评论内容 / 用户名 / 商品名..." value={keyword} onChange={(v) => { setKeyword(v); setPage(1); }} />
        <AdminFilterSummaryBar chips={filterChips} onClearAll={clearReviewFilters} onRemove={handleRemoveFilterChip} />
        <details className="group rounded-xl border border-border bg-card px-3 py-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none">
            <span className="text-muted-foreground group-open:hidden">展开高级筛选</span>
            <span className="hidden group-open:inline">收起高级筛选</span>
          </summary>
          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-center">
            <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={rating} onChange={(e) => { setRating(Number(e.target.value)); setPage(1); }} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
              {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <select value={complaintStatus} onChange={(e) => { setComplaintStatus(e.target.value); setPage(1); }} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
              {COMPLAINT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </details>
      </div>

      {/* Batch actions */}
      {selected.length > 0 && status !== "deleted" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-3 py-3">
          <span className="text-sm font-medium text-foreground">已选 {selected.length} 项</span>
          <span className="h-4 w-px bg-border" />
          <PermissionGate anyOf={REVIEW_MODERATE}>
            <button type="button" onClick={() => confirm({ title: "确认批量隐藏", description: `确定隐藏选中的 ${selected.length} 条评论？`, confirmText: "隐藏", onConfirm: () => handleBatchHide() })} className="touch-manipulation flex min-h-[40px] items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary">
              <EyeOff size={14} /><Tx> 批量隐藏</Tx>
            </button>
          </PermissionGate>
          <PermissionGate anyOf={REVIEW_DELETE}>
            <button type="button" onClick={() => confirm({ title: "确认批量删除", description: `确定删除选中的 ${selected.length} 条评论？`, confirmText: "删除", danger: true, onConfirm: () => handleBatchDelete() })} className={`touch-manipulation flex min-h-[40px] items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs ${THEME_TEXT_DANGER} hover:bg-secondary`}>
              <Trash2 size={14} /><Tx> 批量删除</Tx>
            </button>
          </PermissionGate>
        </div>
      )}

      <div className="space-y-3 md:hidden">
        {loading ? Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />) : null}
        {!loading && reviews.map((r) => {
              const badge = STATUS_BADGE[r.status] || STATUS_BADGE.normal;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-gold mt-1 h-5 w-5 shrink-0" />
                    {r.avatar ? (
                      <img src={r.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full btn-theme-price text-xs font-bold text-primary-foreground">{(r.nickname || "?")[0]}</div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{r.nickname || "匿名"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.text}</span>
                      </div>
                      <StarRating rating={r.rating} />
                      {r.is_verified_purchase && (
                        <span className={`inline-block rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${THEME_BADGE_SUCCESS}`}>已购评价{r.order_id ? ` · ${r.order_id.slice(-8)}` : ""}</span>
                      )}
                      <button type="button" onClick={() => openDetail(r.id)} className="block w-full text-left text-sm text-foreground leading-relaxed hover:text-theme-price">{r.content}</button>
                      {r.images?.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto">
                          {r.images.map((img, i) => <img key={i} src={img} alt="" className="h-14 w-14 rounded-lg object-cover" />)}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">商品：{r.product_name || "未命名商品"}</p>
                      <p className="text-[11px] text-muted-foreground">{r.created_at ? formatDateTime(r.created_at) : ""}</p>
                      {r.admin_reply && (
                        <div className="rounded-lg bg-secondary/50 p-2 text-xs text-muted-foreground">
                          <span className="font-medium text-theme-price"><Tx>官方回复: </Tx></span>{r.admin_reply}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <button type="button" onClick={() => openDetail(r.id)} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                          <Info size={12} className="mr-1 inline" /><Tx>详情</Tx>
                        </button>
                        {r.status === "pending" && (
                          <PermissionGate anyOf={REVIEW_MODERATE}>
                            <button type="button" onClick={() => handleApprove(r.id)} className={`touch-manipulation min-h-[40px] rounded-lg px-3 py-1.5 text-xs ${THEME_OUTLINE_SUCCESS}`}>
                              <Check size={12} className="mr-1 inline" /><Tx>通过</Tx>
                            </button>
                            <button type="button" onClick={() => handleReject(r.id)} className={`touch-manipulation min-h-[40px] rounded-lg px-3 py-1.5 text-xs ${THEME_OUTLINE_WARNING}`}>
                              <XCircle size={12} className="mr-1 inline" /><Tx>拒绝</Tx>
                            </button>
                          </PermissionGate>
                        )}
                        {r.status !== "deleted" && r.status !== "pending" && r.status !== "rejected" && (
                          <>
                            <PermissionGate anyOf={REVIEW_FEATURE}>
                              <button type="button" onClick={() => confirm({ title: "确认操作", description: "确定切换该评论的精选状态？", onConfirm: () => handleToggleFeatured(r.id) })} className={`touch-manipulation min-h-[40px] rounded-lg border px-3 py-1.5 text-xs hover:bg-secondary ${r.is_featured ? "border-gold bg-gold/10 text-theme-price" : "border-border"}`}>
                                <Sparkles size={12} className="mr-1 inline" />{r.is_featured ? "已精选" : "设精选"}
                              </button>
                            </PermissionGate>
                            <PermissionGate anyOf={REVIEW_MODERATE}>
                              <button type="button" onClick={() => confirm({ title: "确认操作", description: "确定切换该评论的显示状态？", onConfirm: () => handleToggle(r.id) })} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                                {r.status === "hidden" ? <><Eye size={12} className="mr-1 inline" /><Tx>显示</Tx></> : <><EyeOff size={12} className="mr-1 inline" /><Tx>隐藏</Tx></>}
                              </button>
                            </PermissionGate>
                            <PermissionGate anyOf={REVIEW_REPLY}>
                              <button type="button" onClick={() => { setReplyTarget(r); setReplyText(r.admin_reply || ""); }} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                                <MessageSquare size={12} className="mr-1 inline" /><Tx>回复</Tx>
                              </button>
                            </PermissionGate>
                            {r.rating <= 2 && (
                              <PermissionGate anyOf={REVIEW_MODERATE}>
                                <button type="button" onClick={() => { setComplaintTarget(r); setComplaintForm({ status: (r.complaint_status as ComplaintStatus) || "pending", note: r.complaint_note || "" }); }} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"><Tx>差评</Tx></button>
                              </PermissionGate>
                            )}
                            <PermissionGate anyOf={REVIEW_DELETE}>
                              <button type="button" onClick={() => adminConfirmDelete(confirm, "该评论", () => handleDelete(r.id))} className={`touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs ${THEME_TEXT_DANGER} hover:bg-secondary`}>
                                <Trash2 size={12} className="mr-1 inline" /><Tx>删除</Tx>
                              </button>
                            </PermissionGate>
                          </>
                        )}
                        {r.status === "deleted" && (
                          <PermissionGate anyOf={REVIEW_DELETE}>
                            <button type="button" onClick={() => handleRestore(r.id)} className={`touch-manipulation min-h-[40px] rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-xs ${THEME_TEXT_SUCCESS_SOFT} hover:bg-[var(--theme-bg)]`}>
                              <RotateCcw size={12} className="mr-1 inline" /><Tx>恢复</Tx>
                            </button>
                            <button type="button" onClick={() => setConfirmDelete({ id: r.id, permanent: true })} className={`touch-manipulation min-h-[40px] rounded-lg border px-3 py-1.5 text-xs ${THEME_BORDER_DANGER_SOFT} ${THEME_TEXT_DANGER} ${THEME_HOVER_BG_DANGER}`}><Tx>彻底删除</Tx></button>
                          </PermissionGate>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
        {!loading && reviews.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground"><Tx>暂无评论数据</Tx></div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
      </div>

      <div className="hidden md:block rounded-xl border border-border bg-card">
        <AnimatedTable
          embedded
          loading={loading}
          rows={reviews}
          rowKey={(r) => r.id}
          skeletonRows={8}
          skeletonCols={9}
          tableClassName="w-full min-w-[900px] text-sm"
          theadClassName="border-b border-border bg-secondary/50"
          thead={(
            <tr>
              <th className="px-3 py-3 text-left">
                <input type="checkbox" checked={selected.length === reviews.length && reviews.length > 0} onChange={toggleAll} className="accent-gold" />
              </th>
              {["用户", "星级", "评论内容", "商品", "状态", "官方回复", "时间", "操作"].map((h) => (
                <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
              ))}
            </tr>
          )}
          emptyIcon={reviewsEmptyGuide.icon}
          emptyTitle={reviewsEmptyGuide.title}
          emptyDescription={reviewsEmptyGuide.description}
          emptyAction={(
            <AdminEmptyGuideActions
              guide={reviewsEmptyGuide}
              showClearFilters={filtersActive}
              onClearFilters={clearReviewFilters}
            />
          )}
          renderRow={(r) => {
            const badge = STATUS_BADGE[r.status] || STATUS_BADGE.normal;
            return (
              <>
                <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-gold" /></td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    {r.avatar ? (
                      <img src={r.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full btn-theme-price text-[10px] font-bold text-primary-foreground">{(r.nickname || "?")[0]}</div>
                    )}
                    <span className="text-xs text-foreground">{r.nickname || "匿名"}</span>
                  </div>
                </td>
                <td className="px-3 py-3"><StarRating rating={r.rating} /></td>
                <td className="max-w-[12rem] px-3 py-3 align-middle">
                  <button type="button" onClick={() => openDetail(r.id)} className="block w-full min-w-0 text-left">
                    <AdminTableCell value={r.content} fullText={r.content} maxWidth="11rem" />
                  </button>
                  {r.is_verified_purchase && <p className={`mt-0.5 text-[10px] ${THEME_TEXT_SUCCESS_SOFT}`}>已购</p>}
                  {r.images?.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {r.images.slice(0, 3).map((img, i) => <img key={i} src={img} alt="" className="h-8 w-8 rounded object-cover" />)}
                      {r.images.length > 3 && <span className="text-[10px] text-muted-foreground">+{r.images.length - 3}</span>}
                    </div>
                  )}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1.5">
                    {r.product_cover && <img src={r.product_cover} alt="" className="h-7 w-7 rounded object-cover" />}
                    <AdminTableCell value={r.product_name || "—"} fullText={r.product_name || ""} maxWidth="6.5rem" />
                  </div>
                </td>
                <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.text}</span></td>
                <td className="max-w-[9rem] px-3 py-3 align-middle">
                  <AdminTableCell value={r.admin_reply || "—"} fullText={r.admin_reply || ""} maxWidth="8.5rem" muted />
                </td>
                <td className="px-3 py-3 text-[11px] text-muted-foreground whitespace-nowrap">{r.created_at ? formatDateTime(r.created_at) : "—"}</td>
                <td className="px-3 py-3">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => openDetail(r.id)} className="touch-manipulation rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary" title="详情"><Info size={14} /></button>
                    {r.status === "pending" && (
                      <PermissionGate anyOf={REVIEW_MODERATE}>
                        <button type="button" onClick={() => handleApprove(r.id)} className={`touch-manipulation rounded-lg p-1.5 ${THEME_OUTLINE_SUCCESS}`} title="通过"><Check size={14} /></button>
                        <button type="button" onClick={() => handleReject(r.id)} className={`touch-manipulation rounded-lg p-1.5 ${THEME_OUTLINE_WARNING}`} title="拒绝"><XCircle size={14} /></button>
                      </PermissionGate>
                    )}
                    {r.status !== "deleted" && r.status !== "pending" && r.status !== "rejected" && (
                      <>
                        <PermissionGate anyOf={REVIEW_FEATURE}><button type="button" onClick={() => confirm({ title: "确认", description: "切换精选？", onConfirm: () => handleToggleFeatured(r.id) })} className={`touch-manipulation rounded-lg border p-1.5 ${r.is_featured ? "border-gold bg-gold/10 text-theme-price" : "border-border text-muted-foreground"}`}><Sparkles size={14} /></button></PermissionGate>
                        <PermissionGate anyOf={REVIEW_MODERATE}><button type="button" onClick={() => confirm({ title: "确认", description: "切换显示？", onConfirm: () => handleToggle(r.id) })} className="touch-manipulation rounded-lg border border-border p-1.5 text-muted-foreground">{r.status === "hidden" ? <Eye size={14} /> : <EyeOff size={14} />}</button></PermissionGate>
                        <PermissionGate anyOf={REVIEW_REPLY}><button type="button" onClick={() => { setReplyTarget(r); setReplyText(r.admin_reply || ""); }} className="touch-manipulation rounded-lg border border-border p-1.5 text-muted-foreground"><MessageSquare size={14} /></button></PermissionGate>
                        <PermissionGate anyOf={REVIEW_DELETE}><button type="button" onClick={() => adminConfirmDelete(confirm, "该评论", () => handleDelete(r.id))} className={`touch-manipulation rounded-lg border border-border p-1.5 text-muted-foreground ${THEME_HOVER_TEXT_DANGER}`}><Trash2 size={14} /></button></PermissionGate>
                      </>
                    )}
                    {r.status === "deleted" && (
                      <PermissionGate anyOf={REVIEW_DELETE}>
                        <button type="button" onClick={() => handleRestore(r.id)} className={`touch-manipulation rounded-lg border border-[var(--theme-border)] p-1.5 ${THEME_TEXT_SUCCESS_SOFT}`}><RotateCcw size={14} /></button>
                        <button type="button" onClick={() => setConfirmDelete({ id: r.id, permanent: true })} className={`touch-manipulation rounded-lg border p-1.5 ${THEME_BORDER_DANGER_SOFT} ${THEME_TEXT_DANGER}`}><Trash2 size={14} /></button>
                      </PermissionGate>
                    )}
                  </div>
                </td>
              </>
            );
          }}
        />
        {(loading || reviews.length > 0) && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        )}
      </div>


      {(detail || detailLoading) && (
        <AdminReviewDetailDialog
          detail={detail}
          loading={detailLoading}
          onClose={() => setDetail(null)}
          previewImage={setImagePreview}
        />
      )}

      {imagePreview && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 p-4" onClick={() => setImagePreview(null)}>
          <img src={imagePreview} alt="" className="max-h-[90vh] max-w-full rounded-lg object-contain" onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {complaintTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setComplaintTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground"><Tx>差评处理</Tx></h3>
            <select value={complaintForm.status} onChange={(e) => setComplaintForm((f) => ({ ...f, status: e.target.value as ComplaintStatus }))} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm">
              {COMPLAINT_OPTIONS.filter((o) => o.value).map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <textarea value={complaintForm.note} onChange={(e) => setComplaintForm((f) => ({ ...f, note: e.target.value }))} placeholder="内部备注..." rows={3} className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm resize-none" />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setComplaintTarget(null)} className="rounded-xl border border-border px-4 py-2 text-sm"><Tx>取消</Tx></button>
              <button type="button" onClick={handleSaveComplaint} className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-primary-foreground"><Tx>保存</Tx></button>
            </div>
          </div>
        </div>
      )}

      {/* Reply modal */}
      {replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReplyTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground"><Tx>官方回复</Tx></h3>
            <div className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
              <p className="text-xs font-medium text-foreground mb-1">{replyTarget.nickname} ({replyTarget.rating}星)</p>
              <p>{replyTarget.content}</p>
            </div>
            <textarea
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder="输入官方回复..."
              rows={4}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-gold resize-none"
            />
            <div className="flex justify-end gap-2">
              <button type="button" onClick={() => setReplyTarget(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary"><Tx>取消</Tx></button>
              <button type="button" onClick={handleReply} disabled={!replyText.trim()} className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"><Tx>提交回复</Tx></button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4 text-center">
            <AlertTriangle size={40} className={`mx-auto ${THEME_TEXT_DANGER}`} />
            <h3 className="font-bold text-foreground"><Tx>确认彻底删除</Tx></h3>
            <p className="text-sm text-muted-foreground"><Tx>此操作不可恢复，评论数据将被永久删除。</Tx></p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary"><Tx>取消</Tx></button>
              <button type="button" onClick={() => handlePermanentDelete(confirmDelete.id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${THEME_BTN_DANGER_SOLID}`}><Tx>确认删除</Tx></button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

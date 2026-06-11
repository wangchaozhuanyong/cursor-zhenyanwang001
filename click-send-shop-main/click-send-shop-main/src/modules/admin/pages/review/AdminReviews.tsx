import { formatDateTime } from "@/utils/formatDateTime";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
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
import { AdminTableMobileCard } from "@/components/admin/AdminTableMobileCard";
import AdminFilterSummaryBar from "@/components/admin/AdminFilterSummaryBar";
import { AdminEmptyGuideActions } from "@/components/admin/AdminEmptyGuideActions";
import { AdminFilterSelect } from "@/components/admin/AdminFilterControls";
import { ADMIN_EMPTY_GUIDES } from "@/config/adminEmptyStateGuides";
import { useLocalizedAdminEmptyGuide } from "@/hooks/useLocalizedAdminEmptyGuide";
import {
  buildReviewFilterChips,
  hasActiveReviewFilters,
  removeReviewFilterChip,
} from "@/utils/adminReviewFilters";
import { Tx } from "@/components/admin/AdminText";
import AdminPageShell from "@/components/admin/AdminPageShell";
import SegmentedDateInput from "@/components/admin/SegmentedDateInput";
import { adminConfirmDelete, useAdminConfirm } from "@/modules/admin/context/AdminConfirmContext";
import { AdminFormSheet } from "@/modules/admin/components/AdminFormSheet";
import { AdminResponsiveSheet } from "@/modules/admin/components/AdminResponsiveSheet";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminTabDirty } from "@/hooks/useAdminTabDirty";
import AdminRowActionsMenu from "@/components/admin/AdminRowActionsMenu";
import { useAdminPermissionStore } from "@/stores/useAdminPermissionStore";
import {
  THEME_BADGE_DANGER,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
  THEME_OUTLINE_SUCCESS,
  THEME_OUTLINE_WARNING,
  THEME_TEXT_SUCCESS_SOFT,
  THEME_STAR_FILLED,
  THEME_TEXT_DANGER,
  THEME_BORDER_DANGER_SOFT,
  THEME_HOVER_BG_DANGER,
} from "@/utils/themeVisuals";
import {
  adminTableCellClass,
  adminTableHeadCellClass,
  type AdminTableAlign,
} from "@/utils/adminTableClasses";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

const REVIEW_TABLE_HEADERS = [
  "用户", "星级", "评论内容", "商品", "状态", "官方回复", "时间", "操作",
] as const;
const REVIEW_COLUMN_ALIGNS: AdminTableAlign[] = [
  "left", "center", "left", "left", "center", "left", "left", "right",
];

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


export default function AdminReviews() {
  const { tText } = useAdminT();
  const { confirm } = useAdminConfirm();
  const canAny = useAdminPermissionStore((s) => s.canAny);
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [userId, setUserId] = useState(searchParams.get("userId") || "");
  const [productId, setProductId] = useState(searchParams.get("productId") || "");
  const [dateFrom, setDateFrom] = useState(searchParams.get("dateFrom") || "");
  const [dateTo, setDateTo] = useState(searchParams.get("dateTo") || "");
  const [verifiedOnly, setVerifiedOnly] = useState(searchParams.get("verifiedOnly") || "");
  const [status, setStatus] = useState("");
  const [complaintStatus, setComplaintStatus] = useState("");
  const [rating, setRating] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [replyTarget, setReplyTarget] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [detail, setDetail] = useState<ReviewDetailPayload | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [complaintTarget, setComplaintTarget] = useState<AdminReview | null>(null);
  const [complaintForm, setComplaintForm] = useState<{ status: ComplaintStatus; note: string }>({ status: "pending", note: "" });
  const replyDirty = Boolean(replyTarget && replyText !== (replyTarget.admin_reply || ""));
  const complaintDirty = Boolean(
    complaintTarget
      && (
        complaintForm.status !== ((complaintTarget.complaint_status as ComplaintStatus) || "pending")
        || complaintForm.note !== (complaintTarget.complaint_note || "")
      ),
  );
  useAdminTabDirty(replyDirty || complaintDirty);

  const queryParams = useMemo(() => {
    const params: ReviewListParams = { page, pageSize, sortBy: "created_at", sortOrder: "DESC" };
    if (keyword) params.keyword = keyword;
    if (status) {
      params.status = status;
      if (status === "deleted") params.includeDeleted = "true";
    }
    if (rating) params.rating = rating;
    if (complaintStatus) params.complaintStatus = complaintStatus;
    if (userId.trim()) params.userId = userId.trim();
    if (productId.trim()) params.productId = productId.trim();
    if (dateFrom.trim()) params.dateFrom = dateFrom.trim();
    if (dateTo.trim()) params.dateTo = dateTo.trim();
    if (verifiedOnly === "1") params.verifiedOnly = "true";
    return params;
  }, [page, pageSize, keyword, status, rating, complaintStatus, userId, productId, dateFrom, dateTo, verifiedOnly]);

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
      toast.success(tText("已通过审核"));
      void invalidateReviews();
      if (detail?.review.id === id) openDetail(id);
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleReject = async (id: string) => {
    try {
      await reviewService.rejectReview(id);
      toast.success(tText("已拒绝"));
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleSaveComplaint = async () => {
    if (!complaintTarget) return;
    try {
      await reviewService.updateComplaint(complaintTarget.id, complaintForm.status, complaintForm.note.trim() || undefined);
      toast.success(tText("差评处理已更新"));
      setComplaintTarget(null);
      setComplaintForm({ status: "pending", note: "" });
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "保存失败")); }
  };

  const filterState = useMemo(
    () => ({ keyword, status, rating, complaintStatus, userId, productId, dateFrom, dateTo, verifiedOnly }),
    [keyword, status, rating, complaintStatus, userId, productId, dateFrom, dateTo, verifiedOnly],
  );
  const filterChips = useMemo(() => buildReviewFilterChips(filterState), [filterState]);
  const filtersActive = hasActiveReviewFilters(filterState);
  const reviewsEmptyGuide = useLocalizedAdminEmptyGuide(
    filtersActive ? ADMIN_EMPTY_GUIDES.reviewsFiltered : ADMIN_EMPTY_GUIDES.reviews,
  );

  const syncReviewSearchParams = (patch: Partial<{
    userId: string;
    productId: string;
    dateFrom: string;
    dateTo: string;
    verifiedOnly: string;
  }>) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      const entries: Array<[string, string]> = [
        ["userId", patch.userId ?? userId],
        ["productId", patch.productId ?? productId],
        ["dateFrom", patch.dateFrom ?? dateFrom],
        ["dateTo", patch.dateTo ?? dateTo],
        ["verifiedOnly", patch.verifiedOnly ?? verifiedOnly],
      ];
      for (const [key, value] of entries) {
        if (value.trim()) next.set(key, value.trim());
        else next.delete(key);
      }
      return next;
    }, { replace: true });
  };

  const clearReviewFilters = () => {
    setKeyword("");
    setUserId("");
    setProductId("");
    setDateFrom("");
    setDateTo("");
    setVerifiedOnly("");
    setStatus("");
    setRating(0);
    setComplaintStatus("");
    setPage(1);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      ["userId", "productId", "dateFrom", "dateTo", "verifiedOnly"].forEach((key) => next.delete(key));
      return next;
    }, { replace: true });
  };

  const handleRemoveFilterChip = (key: string) => {
    const patch = removeReviewFilterChip(key);
    if ("keyword" in patch) setKeyword(patch.keyword ?? "");
    if ("status" in patch) setStatus(patch.status ?? "");
    if ("rating" in patch) setRating(patch.rating ?? 0);
    if ("complaintStatus" in patch) setComplaintStatus(patch.complaintStatus ?? "");
    if ("userId" in patch) {
      setUserId(patch.userId ?? "");
      syncReviewSearchParams({ userId: patch.userId ?? "" });
    }
    if ("productId" in patch) {
      setProductId(patch.productId ?? "");
      syncReviewSearchParams({ productId: patch.productId ?? "" });
    }
    if ("dateFrom" in patch) {
      setDateFrom(patch.dateFrom ?? "");
      syncReviewSearchParams({ dateFrom: patch.dateFrom ?? "" });
    }
    if ("dateTo" in patch) {
      setDateTo(patch.dateTo ?? "");
      syncReviewSearchParams({ dateTo: patch.dateTo ?? "" });
    }
    if ("verifiedOnly" in patch) {
      setVerifiedOnly(patch.verifiedOnly ?? "");
      syncReviewSearchParams({ verifiedOnly: patch.verifiedOnly ?? "" });
    }
    setPage(1);
  };

  const handleToggle = async (id: string) => {
    try {
      await reviewService.toggleVisibility(id);
      toast.success(tText("状态已更新"));
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      await reviewService.toggleFeatured(id);
      toast.success(tText("精选状态已更新"));
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleDelete = async (id: string) => {
    try {
      await reviewService.deleteReview(id);
      toast.success(tText("已删除"));
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "删除失败")); }
  };

  const handleRestore = async (id: string) => {
    try {
      await reviewService.restoreReview(id);
      toast.success(tText("已恢复"));
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "恢复失败")); }
  };

  const handlePermanentDelete = async (id: string) => {
    await reviewService.permanentDeleteReview(id);
    toast.success(tText("已彻底删除"));
    void invalidateReviews();
  };

  const confirmPermanentDelete = (id: string) => {
    confirm({ title: tText("确认彻底删除"),
      description: "此操作不可恢复，评论数据将被永久删除。",
      confirmText: "确认删除",
      danger: true,
      onConfirm: () => handlePermanentDelete(id),
    });
  };

  const handleReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    try {
      await reviewService.replyReview(replyTarget.id, replyText.trim());
      toast.success(tText("回复成功"));
      setReplyTarget(null);
      setReplyText("");
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "回复失败")); }
  };

  const handleBatchHide = async () => {
    try {
      const affected = await reviewService.batchHide(selected);
      toast.success(tText(`已隐藏 ${affected}/${selected.length} 条评论`));
      setSelected([]);
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleBatchDelete = async () => {
    try {
      const affected = await reviewService.batchDelete(selected);
      toast.success(tText(`已删除 ${affected}/${selected.length} 条评论`));
      setSelected([]);
      void invalidateReviews();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  const allReviewsOnPageSelected = reviews.length > 0 && reviews.every((r) => selected.includes(r.id));

  const toggleAll = () => {
    const pageReviewIds = reviews.map((r) => r.id);
    setSelected((prev) => (
      allReviewsOnPageSelected
        ? prev.filter((id) => !pageReviewIds.includes(id))
        : [...new Set([...prev, ...pageReviewIds])]
    ));
  };

  const renderMobileCard = (r: AdminReview) => {
    const badge = STATUS_BADGE[r.status] || STATUS_BADGE.normal;
    return (
      <AdminTableMobileCard className="p-4 shadow-sm">
<div className="flex items-start gap-3">
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-[var(--theme-primary)] mt-1 h-5 w-5 shrink-0" />
                    {r.avatar ? (
                      <img src={r.avatar} alt={`${r.nickname || "用户"} 头像`} className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full btn-theme-price text-xs font-bold text-[var(--theme-price-foreground)]">{(r.nickname || "?")[0]}</div>
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
                      <UnifiedButton type="button" onClick={() => openDetail(r.id)} className="block w-full text-left text-sm text-foreground leading-relaxed hover:text-theme-price">{r.content}</UnifiedButton>
                      {r.images?.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto">
                          {r.images.map((img, i) => <img key={i} src={img} alt={`${r.product_name || "商品"} 评价图片 ${i + 1}`} className="h-14 w-14 rounded-lg object-cover" />)}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">商品：{r.product_name || "未命名商品"}</p>
                      <p className="text-[11px] text-muted-foreground">{r.created_at ? formatDateTime(r.created_at) : ""}</p>
                      {r.admin_reply && (
                        <div className="rounded-lg bg-secondary/50 p-2 text-xs text-muted-foreground">
                          <span className="font-medium text-theme-price"><Tx>官方回复:</Tx></span>{r.admin_reply}
                        </div>
                      )}
                      <div className="flex flex-wrap gap-2 pt-1">
                        <UnifiedButton type="button" onClick={() => openDetail(r.id)} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                          <Info size={12} className="mr-1 inline" /><Tx>详情</Tx>
                        </UnifiedButton>
                        {r.status === "pending" && (
                          <PermissionGate anyOf={REVIEW_MODERATE}>
                            <UnifiedButton type="button" onClick={() => handleApprove(r.id)} className={`touch-manipulation min-h-[40px] rounded-lg px-3 py-1.5 text-xs ${THEME_OUTLINE_SUCCESS}`}>
                              <Check size={12} className="mr-1 inline" /><Tx>通过</Tx>
                            </UnifiedButton>
                            <UnifiedButton type="button" onClick={() => handleReject(r.id)} className={`touch-manipulation min-h-[40px] rounded-lg px-3 py-1.5 text-xs ${THEME_OUTLINE_WARNING}`}>
                              <XCircle size={12} className="mr-1 inline" /><Tx>拒绝</Tx>
                            </UnifiedButton>
                          </PermissionGate>
                        )}
                        {r.status === "rejected" && (
                          <>
                            <PermissionGate anyOf={REVIEW_REPLY}>
                              <UnifiedButton type="button" onClick={() => { setReplyTarget(r); setReplyText(r.admin_reply || ""); }} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                                <MessageSquare size={12} className="mr-1 inline" /><Tx>回复</Tx>
                              </UnifiedButton>
                            </PermissionGate>
                            <PermissionGate anyOf={REVIEW_DELETE}>
                              <UnifiedButton type="button" onClick={() => adminConfirmDelete(confirm, "该评论", () => handleDelete(r.id))} className={`touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs ${THEME_TEXT_DANGER} hover:bg-secondary`}>
                                <Trash2 size={12} className="mr-1 inline" /><Tx>删除</Tx>
                              </UnifiedButton>
                            </PermissionGate>
                          </>
                        )}
                        {r.status !== "deleted" && r.status !== "pending" && r.status !== "rejected" && (
                          <>
                            <PermissionGate anyOf={REVIEW_FEATURE}>
                              <UnifiedButton type="button" onClick={() => confirm({ title: tText("确认操作"), description: "确定切换该评论的精选状态？", onConfirm: () => handleToggleFeatured(r.id) })} className={`touch-manipulation min-h-[40px] rounded-lg border px-3 py-1.5 text-xs hover:bg-secondary ${r.is_featured ? "border-[var(--theme-price)] bg-[color-mix(in_srgb,var(--theme-price)_10%,var(--theme-surface))] text-theme-price" : "border-border"}`}>
                                <Sparkles size={12} className="mr-1 inline" />{r.is_featured ? "已精选" : "设精选"}
                              </UnifiedButton>
                            </PermissionGate>
                            <PermissionGate anyOf={REVIEW_MODERATE}>
                              <UnifiedButton type="button" onClick={() => confirm({ title: tText("确认操作"), description: "确定切换该评论的显示状态？", onConfirm: () => handleToggle(r.id) })} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                                {r.status === "hidden" ? <><Eye size={12} className="mr-1 inline" /><Tx>显示</Tx></> : <><EyeOff size={12} className="mr-1 inline" /><Tx>隐藏</Tx></>}
                              </UnifiedButton>
                            </PermissionGate>
                            <PermissionGate anyOf={REVIEW_REPLY}>
                              <UnifiedButton type="button" onClick={() => { setReplyTarget(r); setReplyText(r.admin_reply || ""); }} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                                <MessageSquare size={12} className="mr-1 inline" /><Tx>回复</Tx>
                              </UnifiedButton>
                            </PermissionGate>
                            {r.rating <= 2 && (
                              <PermissionGate anyOf={REVIEW_MODERATE}>
                                <UnifiedButton type="button" onClick={() => { setComplaintTarget(r); setComplaintForm({ status: (r.complaint_status as ComplaintStatus) || "pending", note: r.complaint_note || "" }); }} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary"><Tx>差评</Tx></UnifiedButton>
                              </PermissionGate>
                            )}
                            <PermissionGate anyOf={REVIEW_DELETE}>
                              <UnifiedButton type="button" onClick={() => adminConfirmDelete(confirm, "该评论", () => handleDelete(r.id))} className={`touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs ${THEME_TEXT_DANGER} hover:bg-secondary`}>
                                <Trash2 size={12} className="mr-1 inline" /><Tx>删除</Tx>
                              </UnifiedButton>
                            </PermissionGate>
                          </>
                        )}
                        {r.status === "deleted" && (
                          <PermissionGate anyOf={REVIEW_DELETE}>
                            <UnifiedButton type="button" onClick={() => handleRestore(r.id)} className={`touch-manipulation min-h-[40px] rounded-lg border border-[var(--theme-border)] px-3 py-1.5 text-xs ${THEME_TEXT_SUCCESS_SOFT} hover:bg-[var(--theme-bg)]`}>
                              <RotateCcw size={12} className="mr-1 inline" /><Tx>恢复</Tx>
                            </UnifiedButton>
                            <UnifiedButton type="button" onClick={() => confirmPermanentDelete(r.id)} className={`touch-manipulation min-h-[40px] rounded-lg border px-3 py-1.5 text-xs ${THEME_BORDER_DANGER_SOFT} ${THEME_TEXT_DANGER} ${THEME_HOVER_BG_DANGER}`}><Tx>彻底删除</Tx></UnifiedButton>
                          </PermissionGate>
                        )}
                      </div>
                    </div>
                  </div>
      </AdminTableMobileCard>
    );
  };


  if (error && !loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3 text-muted-foreground">
        <AlertTriangle size={32} />
        <p>{error}</p>
        <UnifiedButton type="button" onClick={() => void listQuery.refetch()} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary"><Tx>重试</Tx></UnifiedButton>
      </div>
    );
  }

  return (
    <AdminPageShell
      hint={<Tx>审核、回复与隐藏商品评论，支持差评跟进与批量操作。</Tx>}
      filters={(
        <div className="space-y-2">
          <SearchBar placeholder={tText("搜索评论内容 / 用户名 / 商品名...")} value={keyword} onChange={(v) => { setKeyword(v); setPage(1); }} />
          <AdminFilterSummaryBar chips={filterChips} onClearAll={clearReviewFilters} onRemove={handleRemoveFilterChip} />
          <details className="group rounded-xl border border-border bg-card px-3 py-2">
          <summary className="cursor-pointer list-none text-sm font-medium text-foreground marker:content-none">
            <span className="text-muted-foreground group-open:hidden"><Tx>展开高级筛选</Tx></span>
            <span className="hidden group-open:inline"><Tx>收起高级筛选</Tx></span>
          </summary>
          <div className="mt-3 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:flex-wrap sm:items-center">
            <AdminFilterSelect value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} variant="card">
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </AdminFilterSelect>
            <AdminFilterSelect value={rating} onChange={(e) => { setRating(Number(e.target.value)); setPage(1); }} variant="card">
              {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </AdminFilterSelect>
            <AdminFilterSelect value={complaintStatus} onChange={(e) => { setComplaintStatus(e.target.value); setPage(1); }} variant="card">
              {COMPLAINT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </AdminFilterSelect>
            <input
              type="text"
              value={userId}
              onChange={(e) => {
                const next = e.target.value;
                setUserId(next);
                setPage(1);
                syncReviewSearchParams({ userId: next });
              }}
              placeholder={tText("用户ID")}
              className="min-w-[12rem] rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <input
              type="text"
              value={productId}
              onChange={(e) => {
                const next = e.target.value;
                setProductId(next);
                setPage(1);
                syncReviewSearchParams({ productId: next });
              }}
              placeholder={tText("商品ID")}
              className="min-w-[12rem] rounded-lg border border-border bg-background px-3 py-2 text-sm"
            />
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground"><Tx>评价开始</Tx></p>
              <SegmentedDateInput
                value={dateFrom}
                onChange={(v) => {
                  setDateFrom(v);
                  setPage(1);
                  syncReviewSearchParams({ dateFrom: v });
                }}
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground"><Tx>评价结束</Tx></p>
              <SegmentedDateInput
                value={dateTo}
                onChange={(v) => {
                  setDateTo(v);
                  setPage(1);
                  syncReviewSearchParams({ dateTo: v });
                }}
              />
            </div>
            <AdminFilterSelect
              value={verifiedOnly}
              onChange={(e) => {
                const next = e.target.value;
                setVerifiedOnly(next);
                setPage(1);
                syncReviewSearchParams({ verifiedOnly: next });
              }}
              variant="card"
            >
              <option value=""><Tx>购买验证（全部）</Tx></option>
              <option value="1"><Tx>仅已购评价</Tx></option>
            </AdminFilterSelect>
          </div>
          </details>
        </div>
      )}
    >
      {/* Batch actions */}
      {selected.length > 0 && status !== "deleted" && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[color-mix(in_srgb,var(--theme-price)_30%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-price)_5%,var(--theme-surface))] px-3 py-3">
          <span className="text-sm font-medium text-foreground">已选 {selected.length} 项</span>
          <span className="h-4 w-px bg-border" />
          <PermissionGate anyOf={REVIEW_MODERATE}>
            <UnifiedButton type="button" onClick={() => confirm({ title: tText("确认批量隐藏"), description: `确定隐藏选中的 ${selected.length} 条评论？`, confirmText: "隐藏", onConfirm: () => handleBatchHide() })} className="touch-manipulation flex min-h-[40px] items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary">
              <EyeOff size={14} /><Tx>批量隐藏</Tx>
            </UnifiedButton>
          </PermissionGate>
          <PermissionGate anyOf={REVIEW_DELETE}>
            <UnifiedButton type="button" onClick={() => confirm({ title: tText("确认批量删除"), description: `确定删除选中的 ${selected.length} 条评论？`, confirmText: "删除", danger: true, onConfirm: () => handleBatchDelete() })} className={`touch-manipulation flex min-h-[40px] items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs ${THEME_TEXT_DANGER} hover:bg-secondary`}>
              <Trash2 size={14} /><Tx>批量删除</Tx>
            </UnifiedButton>
          </PermissionGate>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card">
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
              <th className={adminTableHeadCellClass("center", "px-3 py-3")}>
                <input type="checkbox" checked={allReviewsOnPageSelected} onChange={toggleAll} className="accent-[var(--theme-primary)]" />
              </th>
              {REVIEW_TABLE_HEADERS.map((h, index) => (
                <th key={h} className={adminTableHeadCellClass(REVIEW_COLUMN_ALIGNS[index], "px-3 py-3")}>{h}</th>
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
          mobileCardFrom="md"
          renderMobileCard={renderMobileCard}
          renderRow={(r) => {
            const badge = STATUS_BADGE[r.status] || STATUS_BADGE.normal;
            return (
              <>
                <td className={adminTableCellClass("center", "px-3 py-3")}><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-[var(--theme-primary)]" /></td>
                <td className={adminTableCellClass("left", "px-3 py-3")}>
                  <div className="flex items-center gap-2">
                    {r.avatar ? (
                      <img src={r.avatar} alt={`${r.nickname || "用户"} 头像`} className="h-7 w-7 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-7 w-7 items-center justify-center rounded-full btn-theme-price text-[10px] font-bold text-[var(--theme-price-foreground)]">{(r.nickname || "?")[0]}</div>
                    )}
                    <span className="text-xs text-foreground">{r.nickname || "匿名"}</span>
                  </div>
                </td>
                <td className={adminTableCellClass("center", "px-3 py-3")}><StarRating rating={r.rating} /></td>
                <td className={adminTableCellClass("left", "max-w-[12rem] px-3 py-3")}>
                  <UnifiedButton type="button" onClick={() => openDetail(r.id)} className="block w-full min-w-0 text-left">
                    <AdminTableCell value={r.content} fullText={r.content} maxWidth="11rem" />
                  </UnifiedButton>
                  {r.is_verified_purchase && <p className={`mt-0.5 text-[10px] ${THEME_TEXT_SUCCESS_SOFT}`}><Tx>已购</Tx></p>}
                  {r.images?.length > 0 && (
                    <div className="mt-1 flex gap-1">
                      {r.images.slice(0, 3).map((img, i) => <img key={i} src={img} alt={`${r.product_name || "商品"} 评价图片 ${i + 1}`} className="h-8 w-8 rounded object-cover" />)}
                      {r.images.length > 3 && <span className="text-[10px] text-muted-foreground">+{r.images.length - 3}</span>}
                    </div>
                  )}
                </td>
                <td className={adminTableCellClass("left", "px-3 py-3")}>
                  <div className="flex items-center gap-1.5">
                    {r.product_cover && <img src={r.product_cover} alt={`${r.product_name || "商品"} 商品图`} className="h-7 w-7 rounded object-cover" />}
                    <AdminTableCell value={r.product_name || "—"} fullText={r.product_name || ""} maxWidth="6.5rem" />
                  </div>
                </td>
                <td className={adminTableCellClass("center", "px-3 py-3")}><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.text}</span></td>
                <td className={adminTableCellClass("left", "max-w-[9rem] px-3 py-3")}>
                  <AdminTableCell value={r.admin_reply || "—"} fullText={r.admin_reply || ""} maxWidth="8.5rem" muted />
                </td>
                <td className={adminTableCellClass("left", "px-3 py-3 text-[11px] text-muted-foreground whitespace-nowrap")}>{r.created_at ? formatDateTime(r.created_at) : "—"}</td>
                <td className={adminTableCellClass("right", "px-3 py-3")}>
                  <AdminRowActionsMenu
                    primary={(
                      <UnifiedButton
                        type="button"
                        onClick={() => openDetail(r.id)}
                        className="inline-flex h-8 min-w-[3.25rem] shrink-0 items-center justify-center rounded-md border border-border bg-card px-2.5 text-xs font-medium text-foreground hover:bg-secondary"
                        title={tText("详情")}
                      >
                        <Info size={14} className="mr-1 inline" />
                        <Tx>详情</Tx>
                      </UnifiedButton>
                    )}
                    moreLabel={<Tx>更多</Tx>}
                    items={[
                      ...(r.status === "pending" && canAny(REVIEW_MODERATE) ? ([
                        {
                          key: "approve",
                          label: <Tx>通过</Tx>,
                          icon: <Check size={14} aria-hidden />,
                          onClick: () => handleApprove(r.id),
                        },
                        {
                          key: "reject",
                          label: <Tx>拒绝</Tx>,
                          icon: <XCircle size={14} aria-hidden />,
                          onClick: () => handleReject(r.id),
                        },
                      ] as const) : []),
                      ...(r.status !== "deleted" && canAny(REVIEW_FEATURE) ? ([
                        {
                          key: "featured",
                          label: <Tx>{r.is_featured ? "取消精选" : "设为精选"}</Tx>,
                          icon: <Sparkles size={14} aria-hidden />,
                          onClick: () => confirm({ title: tText("确认操作"), description: "确定切换该评论的精选状态？", onConfirm: () => handleToggleFeatured(r.id) }),
                        },
                      ] as const) : []),
                      ...(r.status !== "deleted" && canAny(REVIEW_MODERATE) ? ([
                        {
                          key: "visibility",
                          label: <Tx>{r.status === "hidden" ? "显示" : "隐藏"}</Tx>,
                          icon: r.status === "hidden" ? <Eye size={14} aria-hidden /> : <EyeOff size={14} aria-hidden />,
                          onClick: () => confirm({ title: tText("确认操作"), description: "确定切换该评论的显示状态？", onConfirm: () => handleToggle(r.id) }),
                        },
                      ] as const) : []),
                      ...(r.status !== "deleted" && canAny(REVIEW_REPLY) ? ([
                        {
                          key: "reply",
                          label: <Tx>回复</Tx>,
                          icon: <MessageSquare size={14} aria-hidden />,
                          onClick: () => {
                            setReplyTarget(r);
                            setReplyText(r.admin_reply || "");
                          },
                        },
                      ] as const) : []),
                      ...(r.rating <= 2 && r.status !== "deleted" && canAny(REVIEW_MODERATE) ? ([
                        {
                          key: "complaint",
                          label: <Tx>差评处理</Tx>,
                          onClick: () => {
                            setComplaintTarget(r);
                            setComplaintForm({ status: (r.complaint_status as ComplaintStatus) || "pending", note: r.complaint_note || "" });
                          },
                        },
                      ] as const) : []),
                      ...(r.status !== "deleted" && canAny(REVIEW_DELETE) ? ([
                        {
                          key: "delete",
                          label: <Tx>删除</Tx>,
                          icon: <Trash2 size={14} aria-hidden />,
                          danger: true,
                          separatorBefore: true,
                          onClick: () => adminConfirmDelete(confirm, "该评论", () => handleDelete(r.id)),
                        },
                      ] as const) : []),
                      ...(r.status === "deleted" && canAny(REVIEW_DELETE) ? ([
                        {
                          key: "restore",
                          label: <Tx>恢复</Tx>,
                          icon: <RotateCcw size={14} aria-hidden />,
                          separatorBefore: true,
                          onClick: () => handleRestore(r.id),
                        },
                        {
                          key: "permanentDelete",
                          label: <Tx>彻底删除</Tx>,
                          danger: true,
                          onClick: () => confirmPermanentDelete(r.id),
                        },
                      ] as const) : []),
                    ]}
                  />
                </td>
              </>
            );
          }}
        />
        {(loading || reviews.length > 0) && (
          <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
        )}
      </div>


      <AdminReviewDetailDialog
        open={Boolean(detail || detailLoading)}
        detail={detail}
        loading={detailLoading}
        onOpenChange={(next) => {
          if (!next) setDetail(null);
        }}
        previewImage={setImagePreview}
      />

      <AdminResponsiveSheet
        open={Boolean(imagePreview)}
        onOpenChange={(next) => {
          if (!next) setImagePreview(null);
        }}
        title={tText("图片预览")}
        size="xl"
      >
        {imagePreview ? (
          <img src={imagePreview} alt="评价图片预览" className="mx-auto max-h-[70vh] w-auto max-w-full rounded-lg object-contain" />
        ) : null}
      </AdminResponsiveSheet>

      <AdminFormSheet
        open={Boolean(complaintTarget)}
        onOpenChange={(next) => {
          if (!next) {
            setComplaintTarget(null);
            setComplaintForm({ status: "pending", note: "" });
          }
        }}
        title={<Tx>差评处理</Tx>}
        submitText="保存"
        onSubmit={handleSaveComplaint}
        size="sm"
      >
        <select
          value={complaintForm.status}
          onChange={(e) => setComplaintForm((f) => ({ ...f, status: e.target.value as ComplaintStatus }))}
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
        >
          {COMPLAINT_OPTIONS.filter((o) => o.value).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <textarea
          value={complaintForm.note}
          onChange={(e) => setComplaintForm((f) => ({ ...f, note: e.target.value }))}
          placeholder={tText("内部备注...")}
          rows={3}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm"
        />
      </AdminFormSheet>

      <AdminFormSheet
        open={Boolean(replyTarget)}
        onOpenChange={(next) => {
          if (!next) {
            setReplyTarget(null);
            setReplyText("");
          }
        }}
        title={<Tx>官方回复</Tx>}
        submitText="提交回复"
        submitDisabled={!replyText.trim()}
        onSubmit={handleReply}
        size="sm"
      >
        {replyTarget ? (
          <div className="rounded-lg bg-secondary/50 p-3 text-sm text-muted-foreground">
            <p className="mb-1 text-xs font-medium text-foreground">
              {replyTarget.nickname} ({replyTarget.rating}星)
            </p>
            <p>{replyTarget.content}</p>
          </div>
        ) : null}
        <textarea
          value={replyText}
          onChange={(e) => setReplyText(e.target.value)}
          placeholder={tText("输入官方回复...")}
          rows={4}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 text-sm outline-none focus:border-[color-mix(in_srgb,var(--theme-primary)_50%,var(--theme-border))] focus:ring-1 focus:ring-[color-mix(in_srgb,var(--theme-primary)_20%,transparent)]"
        />
      </AdminFormSheet>
    </AdminPageShell>
  );
}

import { useEffect, useState, useCallback } from "react";
import { Star, Eye, EyeOff, Trash2, RotateCcw, MessageSquare, AlertTriangle, Sparkles } from "lucide-react";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { toast } from "sonner";
import * as reviewService from "@/services/admin/reviewService";
import type { AdminReview, ReviewListParams } from "@/services/admin/reviewService";
import { toastErrorMessage } from "@/utils/errorMessage";

const STATUS_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "normal", label: "正常" },
  { value: "hidden", label: "已隐藏" },
  { value: "deleted", label: "已删除" },
];

const RATING_OPTIONS = [
  { value: 0, label: "全部星级" },
  { value: 5, label: "5 星" },
  { value: 4, label: "4 星" },
  { value: 3, label: "3 星" },
  { value: 2, label: "2 星" },
  { value: 1, label: "1 星" },
];

const STATUS_BADGE: Record<string, { cls: string; text: string }> = {
  normal: { cls: "bg-green-500/10 text-green-600", text: "正常" },
  hidden: { cls: "bg-yellow-500/10 text-yellow-600", text: "已隐藏" },
  deleted: { cls: "bg-red-500/10 text-red-500", text: "已删除" },
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={12} className={i < rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"} />
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
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState("");
  const [rating, setRating] = useState(0);
  const [selected, setSelected] = useState<string[]>([]);
  const [replyTarget, setReplyTarget] = useState<AdminReview | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; permanent: boolean } | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: ReviewListParams = { page, pageSize, sortBy: "created_at", sortOrder: "DESC" };
      if (keyword) params.keyword = keyword;
      if (status) {
        params.status = status;
        if (status === "deleted") params.includeDeleted = "true";
      }
      if (rating) params.rating = rating;
      const data = await reviewService.fetchReviews(params);
      setReviews(data.list);
      setTotal(data.total);
    } catch (e) {
      setError(toastErrorMessage(e, "加载评论失败"));
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, keyword, status, rating]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleToggle = async (id: string) => {
    try {
      await reviewService.toggleVisibility(id);
      toast.success("状态已更新");
      loadData();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleToggleFeatured = async (id: string) => {
    try {
      await reviewService.toggleFeatured(id);
      toast.success("精选状态已更新");
      loadData();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleDelete = async (id: string) => {
    try {
      await reviewService.deleteReview(id);
      toast.success("已删除");
      loadData();
    } catch (e) { toast.error(toastErrorMessage(e, "删除失败")); }
  };

  const handleRestore = async (id: string) => {
    try {
      await reviewService.restoreReview(id);
      toast.success("已恢复");
      loadData();
    } catch (e) { toast.error(toastErrorMessage(e, "恢复失败")); }
  };

  const handlePermanentDelete = async (id: string) => {
    try {
      await reviewService.permanentDeleteReview(id);
      toast.success("已彻底删除");
      setConfirmDelete(null);
      loadData();
    } catch (e) { toast.error(toastErrorMessage(e, "删除失败")); }
  };

  const handleReply = async () => {
    if (!replyTarget || !replyText.trim()) return;
    try {
      await reviewService.replyReview(replyTarget.id, replyText.trim());
      toast.success("回复成功");
      setReplyTarget(null);
      setReplyText("");
      loadData();
    } catch (e) { toast.error(toastErrorMessage(e, "回复失败")); }
  };

  const handleBatchHide = async () => {
    try {
      await reviewService.batchHide(selected);
      toast.success(`已隐藏 ${selected.length} 条评论`);
      setSelected([]);
      loadData();
    } catch (e) { toast.error(toastErrorMessage(e, "操作失败")); }
  };

  const handleBatchDelete = async () => {
    try {
      await reviewService.batchDelete(selected);
      toast.success(`已删除 ${selected.length} 条评论`);
      setSelected([]);
      loadData();
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
        <button type="button" onClick={loadData} className="rounded-lg border border-border px-4 py-2 text-sm hover:bg-secondary">重试</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1">
          <SearchBar placeholder="搜索评论内容 / 用户名 / 商品名..." value={keyword} onChange={(v) => { setKeyword(v); setPage(1); }} />
        </div>
        <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
          {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={rating} onChange={(e) => { setRating(Number(e.target.value)); setPage(1); }} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
          {RATING_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {/* Batch actions */}
      {selected.length > 0 && (
        <PermissionGate permission="review.manage">
          <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gold/30 bg-gold/5 px-3 py-3">
            <span className="text-sm font-medium text-foreground">已选 {selected.length} 项</span>
            <span className="h-4 w-px bg-border" />
            <button type="button" onClick={handleBatchHide} className="touch-manipulation flex min-h-[40px] items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-foreground hover:bg-secondary">
              <EyeOff size={14} /> 批量隐藏
            </button>
            <button type="button" onClick={handleBatchDelete} className="touch-manipulation flex min-h-[40px] items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs text-destructive hover:bg-secondary">
              <Trash2 size={14} /> 批量删除
            </button>
          </div>
        </PermissionGate>
      )}

      {/* Loading skeleton */}
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 5 }, (_, i) => <SkeletonRow key={i} />)}</div>
      ) : reviews.length === 0 ? (
        <div className="py-16 text-center text-sm text-muted-foreground">暂无评论数据</div>
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-3 md:hidden">
            {reviews.map((r) => {
              const badge = STATUS_BADGE[r.status] || STATUS_BADGE.normal;
              return (
                <div key={r.id} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-gold mt-1 h-5 w-5 shrink-0" />
                    {r.avatar ? (
                      <img src={r.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gold text-xs font-bold text-primary-foreground">{(r.nickname || "?")[0]}</div>
                    )}
                    <div className="min-w-0 flex-1 space-y-1.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium text-foreground">{r.nickname || "匿名"}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.text}</span>
                      </div>
                      <StarRating rating={r.rating} />
                      <p className="text-sm text-foreground leading-relaxed">{r.content}</p>
                      {r.images?.length > 0 && (
                        <div className="flex gap-1.5 overflow-x-auto">
                          {r.images.map((img, i) => <img key={i} src={img} alt="" className="h-14 w-14 rounded-lg object-cover" />)}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">商品: {r.product_name || r.product_id}</p>
                      <p className="text-[11px] text-muted-foreground">{r.created_at ? new Date(r.created_at).toLocaleString("zh-CN") : ""}</p>
                      {r.admin_reply && (
                        <div className="rounded-lg bg-secondary/50 p-2 text-xs text-muted-foreground">
                          <span className="font-medium text-gold">官方回复: </span>{r.admin_reply}
                        </div>
                      )}
                      <PermissionGate permission="review.manage">
                        <div className="flex flex-wrap gap-2 pt-1">
                          {r.status !== "deleted" && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleToggleFeatured(r.id)}
                                className={`touch-manipulation min-h-[40px] rounded-lg border px-3 py-1.5 text-xs hover:bg-secondary ${r.is_featured ? "border-gold bg-gold/10 text-gold" : "border-border"}`}
                              >
                                <Sparkles size={12} className="mr-1 inline" />
                                {r.is_featured ? "已精选" : "设精选"}
                              </button>
                              <button type="button" onClick={() => handleToggle(r.id)} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                                {r.status === "hidden" ? <><Eye size={12} className="mr-1 inline" />显示</> : <><EyeOff size={12} className="mr-1 inline" />隐藏</>}
                              </button>
                              <button type="button" onClick={() => { setReplyTarget(r); setReplyText(r.admin_reply || ""); }} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs hover:bg-secondary">
                                <MessageSquare size={12} className="mr-1 inline" />回复
                              </button>
                              <button type="button" onClick={() => handleDelete(r.id)} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs text-destructive hover:bg-secondary">
                                <Trash2 size={12} className="mr-1 inline" />删除
                              </button>
                            </>
                          )}
                          {r.status === "deleted" && (
                            <>
                              <button type="button" onClick={() => handleRestore(r.id)} className="touch-manipulation min-h-[40px] rounded-lg border border-border px-3 py-1.5 text-xs text-green-600 hover:bg-secondary">
                                <RotateCcw size={12} className="mr-1 inline" />恢复
                              </button>
                              <button type="button" onClick={() => setConfirmDelete({ id: r.id, permanent: true })} className="touch-manipulation min-h-[40px] rounded-lg border border-destructive/30 px-3 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                                彻底删除
                              </button>
                            </>
                          )}
                        </div>
                      </PermissionGate>
                    </div>
                  </div>
                </div>
              );
            })}
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </div>

          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  <th className="px-3 py-3 text-left"><input type="checkbox" checked={selected.length === reviews.length && reviews.length > 0} onChange={toggleAll} className="accent-gold" /></th>
                  {["用户", "星级", "评论内容", "商品", "状态", "官方回复", "时间", "操作"].map((h) => (
                    <th key={h} className="px-3 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {reviews.map((r) => {
                  const badge = STATUS_BADGE[r.status] || STATUS_BADGE.normal;
                  return (
                    <tr key={r.id} className="border-b border-border last:border-0 hover:bg-secondary/30">
                      <td className="px-3 py-3"><input type="checkbox" checked={selected.includes(r.id)} onChange={() => toggleSelect(r.id)} className="accent-gold" /></td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2">
                          {r.avatar ? (
                            <img src={r.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-primary-foreground">{(r.nickname || "?")[0]}</div>
                          )}
                          <span className="text-xs text-foreground">{r.nickname || "匿名"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3"><StarRating rating={r.rating} /></td>
                      <td className="max-w-[200px] px-3 py-3">
                        <p className="truncate text-xs text-foreground" title={r.content}>{r.content}</p>
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
                          <span className="max-w-[100px] truncate text-xs text-foreground" title={r.product_name}>{r.product_name || "—"}</span>
                        </div>
                      </td>
                      <td className="px-3 py-3"><span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${badge.cls}`}>{badge.text}</span></td>
                      <td className="max-w-[120px] px-3 py-3"><p className="truncate text-[11px] text-muted-foreground" title={r.admin_reply || ""}>{r.admin_reply || "—"}</p></td>
                      <td className="px-3 py-3 text-[11px] text-muted-foreground whitespace-nowrap">{r.created_at ? new Date(r.created_at).toLocaleString("zh-CN") : "—"}</td>
                      <td className="px-3 py-3">
                        <PermissionGate permission="review.manage">
                          <div className="flex gap-1">
                            {r.status !== "deleted" ? (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleToggleFeatured(r.id)}
                                  className={`touch-manipulation rounded-lg border p-1.5 hover:bg-secondary ${r.is_featured ? "border-gold bg-gold/10 text-gold" : "border-border text-muted-foreground"}`}
                                  title={r.is_featured ? "取消精选" : "设为精选"}
                                >
                                  <Sparkles size={14} />
                                </button>
                                <button type="button" onClick={() => handleToggle(r.id)} className="touch-manipulation rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary" title={r.status === "hidden" ? "显示" : "隐藏"}>
                                  {r.status === "hidden" ? <Eye size={14} /> : <EyeOff size={14} />}
                                </button>
                                <button type="button" onClick={() => { setReplyTarget(r); setReplyText(r.admin_reply || ""); }} className="touch-manipulation rounded-lg border border-border p-1.5 text-muted-foreground hover:bg-secondary" title="回复">
                                  <MessageSquare size={14} />
                                </button>
                                <button type="button" onClick={() => handleDelete(r.id)} className="touch-manipulation rounded-lg border border-border p-1.5 text-muted-foreground hover:text-destructive hover:bg-secondary" title="删除">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button type="button" onClick={() => handleRestore(r.id)} className="touch-manipulation rounded-lg border border-border p-1.5 text-green-600 hover:bg-secondary" title="恢复">
                                  <RotateCcw size={14} />
                                </button>
                                <button type="button" onClick={() => setConfirmDelete({ id: r.id, permanent: true })} className="touch-manipulation rounded-lg border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10" title="彻底删除">
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </PermissionGate>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </div>
        </>
      )}

      {/* Reply modal */}
      {replyTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReplyTarget(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-card p-6 shadow-xl space-y-4">
            <h3 className="font-bold text-foreground">官方回复</h3>
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
              <button type="button" onClick={() => setReplyTarget(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary">取消</button>
              <button type="button" onClick={handleReply} disabled={!replyText.trim()} className="rounded-xl bg-gold px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50">提交回复</button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4 text-center">
            <AlertTriangle size={40} className="mx-auto text-destructive" />
            <h3 className="font-bold text-foreground">确认彻底删除</h3>
            <p className="text-sm text-muted-foreground">此操作不可恢复，评论数据将被永久删除。</p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary">取消</button>
              <button type="button" onClick={() => handlePermanentDelete(confirmDelete.id)} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

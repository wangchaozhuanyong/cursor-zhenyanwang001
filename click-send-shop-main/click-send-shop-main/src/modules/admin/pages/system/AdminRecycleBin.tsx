import { useEffect, useState, useCallback } from "react";
import { Trash2, RotateCcw, Loader2, AlertTriangle, Archive } from "lucide-react";
import Pagination from "@/components/admin/Pagination";
import PermissionGate from "@/components/admin/PermissionGate";
import { usePagination } from "@/hooks/usePagination";
import { toast } from "sonner";
import {
  loadRecycleBin,
  permanentlyDeleteRecycleBinItem,
  restoreRecycleBinItem,
} from "@/services/admin/recycleBinService";
import type { RecycleBinItem } from "@/services/admin/recycleBinService";

const TYPE_OPTIONS = [
  { value: "", label: "全部类型" },
  { value: "products", label: "商品" },
  { value: "categories", label: "分类" },
  { value: "coupons", label: "优惠券" },
  { value: "banners", label: "Banner" },
  { value: "content_pages", label: "内容页" },
  { value: "product_reviews", label: "评论" },
];

const TYPE_BADGE: Record<string, string> = {
  products: "bg-blue-500/10 text-blue-600",
  categories: "bg-purple-500/10 text-purple-600",
  coupons: "bg-green-500/10 text-green-600",
  banners: "bg-yellow-500/10 text-yellow-600",
  content_pages: "bg-pink-500/10 text-pink-600",
  product_reviews: "bg-orange-500/10 text-orange-600",
};

export default function AdminRecycleBin() {
  const [items, setItems] = useState<RecycleBinItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<RecycleBinItem | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const params = typeFilter ? { type: typeFilter } : {};
      const rows = await loadRecycleBin(params);
      setItems(rows);
    } catch { toast.error("加载回收站失败"); }
    finally { setLoading(false); }
  }, [typeFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(items, 20);

  const handleRestore = async (item: RecycleBinItem) => {
    try {
      await restoreRecycleBinItem(item.id, item.type);
      toast.success("已恢复");
      loadData();
    } catch { toast.error("恢复失败"); }
  };

  const handlePermanentDelete = async () => {
    if (!confirmDelete) return;
    try {
      await permanentlyDeleteRecycleBinItem(confirmDelete.id, confirmDelete.type);
      toast.success("已彻底删除");
      setConfirmDelete(null);
      loadData();
    } catch { toast.error("删除失败"); }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Archive size={20} className="text-muted-foreground" />
          <h2 className="text-lg font-bold text-foreground">回收站</h2>
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} className="touch-manipulation min-h-[44px] rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
          {TYPE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-gold" /></div>
      ) : items.length === 0 ? (
        <div className="py-16 text-center">
          <Trash2 size={40} className="mx-auto text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">回收站为空</p>
        </div>
      ) : (
        <>
          {/* Mobile */}
          <div className="space-y-3 md:hidden">
            {paginatedData.map((item) => (
              <div key={`${item.type}-${item.id}`} className="rounded-xl border border-border bg-card p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {item.cover_image && <img src={item.cover_image} alt="" className="h-12 w-12 shrink-0 rounded-lg object-cover" />}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[item.type] || "bg-muted text-muted-foreground"}`}>
                        {item.type_label || item.type}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-foreground truncate">{item.name || item.id}</p>
                    <p className="text-[11px] text-muted-foreground">删除时间: {item.deleted_at ? new Date(item.deleted_at).toLocaleString("zh-CN") : "—"}</p>
                    <PermissionGate permission="recycle_bin.manage">
                      <div className="flex gap-2 pt-1">
                        <button type="button" onClick={() => handleRestore(item)} className="touch-manipulation min-h-[40px] flex-1 rounded-lg border border-border py-1.5 text-xs text-green-600 hover:bg-secondary">
                          <RotateCcw size={12} className="mr-1 inline" />恢复
                        </button>
                        <button type="button" onClick={() => setConfirmDelete(item)} className="touch-manipulation min-h-[40px] flex-1 rounded-lg border border-destructive/30 py-1.5 text-xs text-destructive hover:bg-destructive/10">
                          <Trash2 size={12} className="mr-1 inline" />彻底删除
                        </button>
                      </div>
                    </PermissionGate>
                  </div>
                </div>
              </div>
            ))}
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </div>

          {/* Desktop */}
          <div className="hidden overflow-x-auto rounded-xl border border-border bg-card md:block">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/50">
                  {["类型", "名称", "删除时间", "操作"].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {paginatedData.map((item) => (
                  <tr key={`${item.type}-${item.id}`} className="border-b border-border last:border-0 hover:bg-secondary/30">
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${TYPE_BADGE[item.type] || "bg-muted text-muted-foreground"}`}>
                        {item.type_label || item.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.cover_image && <img src={item.cover_image} alt="" className="h-8 w-8 rounded object-cover" />}
                        <span className="max-w-[200px] truncate text-foreground" title={item.name}>{item.name || item.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{item.deleted_at ? new Date(item.deleted_at).toLocaleString("zh-CN") : "—"}</td>
                    <td className="px-4 py-3">
                      <PermissionGate permission="recycle_bin.manage">
                        <div className="flex gap-1">
                          <button type="button" onClick={() => handleRestore(item)} className="touch-manipulation rounded-lg border border-border p-1.5 text-green-600 hover:bg-secondary" title="恢复">
                            <RotateCcw size={14} />
                          </button>
                          <button type="button" onClick={() => setConfirmDelete(item)} className="touch-manipulation rounded-lg border border-destructive/30 p-1.5 text-destructive hover:bg-destructive/10" title="彻底删除">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </PermissionGate>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={(s) => { setPageSize(s); setPage(1); }} />
          </div>
        </>
      )}

      {/* Permanent delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setConfirmDelete(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl space-y-4 text-center">
            <AlertTriangle size={40} className="mx-auto text-destructive" />
            <h3 className="font-bold text-foreground">确认彻底删除</h3>
            <p className="text-sm text-muted-foreground">此操作不可恢复！<br />{confirmDelete.type_label}: {confirmDelete.name}</p>
            <div className="flex justify-center gap-3">
              <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-xl border border-border px-4 py-2.5 text-sm hover:bg-secondary">取消</button>
              <button type="button" onClick={handlePermanentDelete} className="rounded-xl bg-destructive px-4 py-2.5 text-sm font-semibold text-white">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

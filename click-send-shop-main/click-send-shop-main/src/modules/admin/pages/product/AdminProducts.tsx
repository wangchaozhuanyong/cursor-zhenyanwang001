import { useEffect, useLayoutEffect } from "react";
import { Plus, Eye, EyeOff, Pencil, Loader2, FolderTree, Tags, Download, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { toast } from "sonner";
import { usePagination } from "@/hooks/usePagination";
import * as productService from "@/services/admin/productService";
import PermissionGate from "@/components/admin/PermissionGate";
import type { Product, ProductStatus } from "@/types/product";
import { useAdminProductsStore } from "@/stores/useAdminProductsStore";
import { toastErrorMessage } from "@/utils/errorMessage";

export default function AdminProducts() {
  const navigate = useNavigate();
  const products = useAdminProductsStore((s) => s.products);
  const loading = useAdminProductsStore((s) => s.loading);
  const search = useAdminProductsStore((s) => s.search);
  const selected = useAdminProductsStore((s) => s.selected);
  const setSearch = useAdminProductsStore((s) => s.setSearch);
  const loadProducts = useAdminProductsStore((s) => s.loadProducts);
  const toggleSelect = useAdminProductsStore((s) => s.toggleSelect);
  const togglePageSelection = useAdminProductsStore((s) => s.togglePageSelection);
  const applyProductStatus = useAdminProductsStore((s) => s.applyProductStatus);
  const applyStatusToIds = useAdminProductsStore((s) => s.applyStatusToIds);
  const replaceProducts = useAdminProductsStore((s) => s.replaceProducts);
  const resetProductsStore = useAdminProductsStore((s) => s.reset);

  useLayoutEffect(() => {
    useAdminProductsStore.setState({ loading: true });
  }, []);

  useEffect(() => {
    loadProducts().catch((e) => toast.error(toastErrorMessage(e, "加载数据失败")));
  }, [loadProducts]);

  useEffect(() => () => resetProductsStore(), [resetProductsStore]);

  const filteredProducts = products.filter((p) =>
    !search || p.name?.toLowerCase().includes(search.toLowerCase())
  );
  const { page, pageSize, setPage, setPageSize, paginatedData, total } = usePagination(filteredProducts, 10);

  const batchToggleStatus = async (status: string) => {
    try {
      await Promise.all(selected.map((id) => productService.updateProduct(id, { status })));
      applyStatusToIds(selected, status as ProductStatus);
      toast.success(`已将 ${selected.length} 个商品${status === "active" ? "上架" : "下架"}`);
    } catch (e) {
      toast.error(toastErrorMessage(e, "操作失败"));
    }
  };

  const handleExportCsv = async () => {
    try {
      await productService.exportProductsCsv({ keyword: search || undefined });
      toast.success("已开始下载 CSV");
    } catch (e) {
      toast.error(toastErrorMessage(e, "导出失败"));
    }
  };

  const handleImportCsv = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const r = await productService.importProductsCsv(file);
      toast.success(`导入完成：新建 ${r.created} 条，更新 ${r.updated} 条`);
      const p = await productService.fetchProducts();
      replaceProducts(p.list as Product[]);
    } catch (err) {
      toast.error(toastErrorMessage(err, "导入失败"));
    }
  };

  const toggleSingleStatus = async (id: string) => {
    const p = products.find((x) => x.id === id);
    if (!p) return;
    const newStatus = p.status === "active" ? "inactive" : "active";
    try {
      await productService.updateProduct(id, { status: newStatus });
      applyProductStatus(id, newStatus);
      toast.success(`${p.name} 已${newStatus === "active" ? "上架" : "下架"}`);
    } catch (e) {
      toast.error(toastErrorMessage(e, "操作失败"));
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--theme-price)]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <div className="min-w-0 flex-1"><SearchBar placeholder="搜索商品名称..." value={search} onChange={(v) => { setSearch(v); setPage(1); }} /></div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => navigate("/admin/categories")} className="touch-manipulation flex min-h-[44px] items-center gap-1.5 theme-rounded border border-[var(--theme-border)] px-4 py-2.5 text-sm text-foreground hover:bg-[var(--theme-bg)]"><FolderTree size={16} /> 分类</button>
          <button type="button" onClick={() => navigate("/admin/tags")} className="touch-manipulation flex min-h-[44px] items-center gap-1.5 theme-rounded border border-[var(--theme-border)] px-4 py-2.5 text-sm text-foreground hover:bg-[var(--theme-bg)]"><Tags size={16} /> 标签</button>
          <PermissionGate permission="product.view">
            <button type="button" onClick={handleExportCsv} className="touch-manipulation flex min-h-[44px] items-center gap-1.5 theme-rounded border border-[var(--theme-border)] px-4 py-2.5 text-sm text-foreground hover:bg-[var(--theme-bg)]"><Download size={16} /> 导出</button>
          </PermissionGate>
          <PermissionGate permission="product.manage">
            <label className="touch-manipulation flex min-h-[44px] cursor-pointer items-center gap-1.5 theme-rounded border border-[var(--theme-border)] px-4 py-2.5 text-sm text-foreground hover:bg-[var(--theme-bg)]">
              <Upload size={16} /> 导入
              <input type="file" accept=".csv,text/csv" className="hidden" onChange={handleImportCsv} />
            </label>
          </PermissionGate>
          <PermissionGate permission="product.manage">
            <button type="button" onClick={() => navigate("/admin/products/new")} className="touch-manipulation flex min-h-[44px] items-center gap-1.5 theme-rounded px-4 py-2.5 text-sm font-semibold text-white active:opacity-90" style={{ background: "var(--theme-gradient)" }}><Plus size={16} /> 新增</button>
          </PermissionGate>
        </div>
      </div>

      {selected.length > 0 && (
        <PermissionGate permission="product.manage">
          <div className="flex flex-wrap items-center gap-2 theme-rounded border border-[var(--theme-price)]/30 bg-[var(--theme-price)]/5 px-3 py-3 sm:px-4">
            <span className="text-sm font-medium text-foreground">已选 {selected.length} 项</span>
            <span className="h-4 w-px bg-border" />
            <button type="button" onClick={() => batchToggleStatus("active")} className="touch-manipulation flex min-h-[40px] items-center gap-1 theme-rounded border border-[var(--theme-border)] px-3 py-2 text-xs text-foreground hover:bg-[var(--theme-bg)]"><Eye size={14} /> 批量上架</button>
            <button type="button" onClick={() => batchToggleStatus("inactive")} className="touch-manipulation flex min-h-[40px] items-center gap-1 theme-rounded border border-[var(--theme-border)] px-3 py-2 text-xs text-foreground hover:bg-[var(--theme-bg)]"><EyeOff size={14} /> 批量下架</button>
          </div>
        </PermissionGate>
      )}

      {/* 移动端：卡片列表 */}
      <div className="space-y-3 md:hidden">
        {paginatedData.map((p) => (
          <div key={p.id} className="theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] p-4 theme-shadow">
            <div className="flex gap-3">
              <input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} className="accent-gold mt-1 h-5 w-5 shrink-0" aria-label="选择" />
              {p.cover_image && (
                <img src={p.cover_image} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-medium leading-snug text-foreground">{p.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">RM <span className="text-[var(--theme-price)]">{p.price}</span> · 库存 {p.stock === 0 ? <span className="text-destructive">缺货</span> : p.stock}</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.status === "active" ? "bg-green-500/10 text-green-600" : "bg-muted text-muted-foreground"}`}>
                    {p.status === "active" ? "上架" : "下架"}
                  </span>
                  {p.is_hot && <span className="rounded bg-red-500/10 px-2 py-0.5 text-xs text-red-500">热门</span>}
                  {p.is_new && <span className="rounded bg-blue-500/10 px-2 py-0.5 text-xs text-blue-500">新品</span>}
                </div>
                <div className="mt-3 flex gap-2">
                  <PermissionGate permission="product.manage">
                    <button type="button" onClick={() => navigate(`/admin/products/${p.id}`)} className="touch-manipulation flex min-h-[44px] flex-1 items-center justify-center gap-1 theme-rounded border border-[var(--theme-border)] py-2 text-sm font-medium text-foreground active:bg-[var(--theme-bg)]">
                      <Pencil size={16} /> 编辑
                    </button>
                  </PermissionGate>
                  <PermissionGate permission="product.manage">
                    <button type="button" onClick={() => toggleSingleStatus(p.id)} className="touch-manipulation flex min-h-[44px] flex-1 items-center justify-center gap-1 theme-rounded border border-[var(--theme-border)] py-2 text-sm active:bg-[var(--theme-bg)]">
                      {p.status === "active" ? <EyeOff size={16} /> : <Eye size={16} />}
                      {p.status === "active" ? "下架" : "上架"}
                    </button>
                  </PermissionGate>
                </div>
              </div>
            </div>
          </div>
        ))}
        {paginatedData.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">暂无商品</div>
        )}
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>

      <div className="hidden overflow-x-auto theme-rounded border border-[var(--theme-border)] bg-[var(--theme-surface)] md:block theme-shadow">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-[var(--theme-border)] bg-[var(--theme-bg)]/70">
              <th className="px-4 py-3 text-left"><input type="checkbox" checked={selected.length === paginatedData.length && paginatedData.length > 0} onChange={() => togglePageSelection(paginatedData.map((x) => x.id))} className="accent-gold" /></th>
              {["商品", "售价", "库存", "状态", "标记", "排序", "操作"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((p) => (
              <tr key={p.id} className="border-b border-[var(--theme-border)] last:border-0 hover:bg-[var(--theme-bg)]">
                <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(p.id)} onChange={() => toggleSelect(p.id)} className="accent-gold" /></td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {p.cover_image && <img src={p.cover_image} alt="" className="h-10 w-10 rounded-lg object-cover" />}
                    <span className="font-medium text-foreground">{p.name}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-foreground">RM {p.price}</td>
                <td className="px-4 py-3 text-foreground">{p.stock === 0 ? <span className="text-destructive">缺货</span> : p.stock}</td>
                <td className="px-4 py-3">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${p.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"}`}>
                    {p.status === "active" ? "上架" : "下架"}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    {p.is_hot && <span className="rounded bg-red-500/10 px-1.5 py-0.5 text-[10px] text-red-500">热门</span>}
                    {p.is_new && <span className="rounded bg-blue-500/10 px-1.5 py-0.5 text-[10px] text-blue-500">新品</span>}
                    {p.is_recommended && <span className="theme-rounded bg-[var(--theme-price)]/10 px-1.5 py-0.5 text-[10px] text-[var(--theme-price)]">推荐</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{p.sort_order}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-1">
                    <PermissionGate permission="product.manage">
                      <button type="button" onClick={() => navigate(`/admin/products/${p.id}`)} className="touch-manipulation theme-rounded border border-[var(--theme-border)] p-2 text-muted-foreground hover:bg-[var(--theme-bg)]"><Pencil size={14} /></button>
                    </PermissionGate>
                    <PermissionGate permission="product.manage">
                      <button type="button" onClick={() => toggleSingleStatus(p.id)} className="touch-manipulation theme-rounded border border-[var(--theme-border)] p-2 text-muted-foreground hover:bg-[var(--theme-bg)]">
                        {p.status === "active" ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </PermissionGate>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </div>
    </div>
  );
}

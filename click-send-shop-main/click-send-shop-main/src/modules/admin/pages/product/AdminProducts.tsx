import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import SearchBar from "@/components/SearchBar";
import Pagination from "@/components/admin/Pagination";
import { useAdminProductsStore } from "@/stores/useAdminProductsStore";

export default function AdminProducts() {
  const navigate = useNavigate();
  const products = useAdminProductsStore((s) => s.products);
  const loading = useAdminProductsStore((s) => s.loading);
  const search = useAdminProductsStore((s) => s.search);
  const setSearch = useAdminProductsStore((s) => s.setSearch);
  const loadProducts = useAdminProductsStore((s) => s.loadProducts);
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const total = products.length;

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <SearchBar placeholder="搜索商品" value={search} onChange={(v) => setSearch(v)} />
        <button className="rounded border px-3 py-2 text-sm" onClick={() => navigate('/admin/products/new')}>新增商品</button>
      </div>
      <div className="rounded-xl border bg-card">
        {loading ? <div className="p-4 text-sm">加载中...</div> : (
          <table className="w-full text-sm">
            <thead><tr><th className="px-4 py-2 text-left">商品</th><th className="px-4 py-2 text-left">价格</th><th className="px-4 py-2 text-left">状态</th></tr></thead>
            <tbody>{products.map((p) => <tr key={p.id}><td className="px-4 py-2">{p.name}</td><td className="px-4 py-2">RM {p.price}</td><td className="px-4 py-2">{p.status}</td></tr>)}</tbody>
          </table>
        )}
      </div>
      <Pagination total={total} page={page} pageSize={pageSize} onPageChange={setPage} onPageSizeChange={() => {}} />
    </div>
  );
}

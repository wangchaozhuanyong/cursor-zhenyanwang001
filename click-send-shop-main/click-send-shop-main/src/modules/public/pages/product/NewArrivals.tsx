import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ProductSortBar from "@/components/ProductSortBar";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useProductStore } from "@/stores/useProductStore";
import type { ProductSortType } from "@/types/product";

export default function NewArrivals() {
  useDocumentTitle("新品上市");
  const navigate = useNavigate();
  const { products, loading, error, loadProducts } = useProductStore();
  const [sort, setSort] = useState<ProductSortType>("newest");

  useEffect(() => {
    loadProducts({
      is_new: true,
      sort: sort === "default" ? undefined : sort,
      page: 1,
      pageSize: 50,
    });
  }, [loadProducts, sort]);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-24 text-[var(--theme-text)]">
      <PageHeader
        title="新品上市"
        rightSlot={(
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]"
            aria-label="搜索新品"
          >
            <Search size={18} className="text-[var(--theme-text)]" />
          </button>
        )}
      />

      <main className="mx-auto max-w-lg px-4 py-4">
        <section>
          <ProductSortBar value={sort} onChange={setSort} />
        </section>

        {error ? (
          <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <section className="mt-4 grid grid-cols-2 gap-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
        </section>

        {!loading && products.length === 0 ? (
          <section className="mt-4 rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-12 text-center">
            <p className="text-sm font-semibold text-[var(--theme-text-on-surface)]">暂无新品上市</p>
            <p className="mt-2 text-xs text-[var(--theme-text-muted)]">新品上架后会自动出现在这里。</p>
            <button
              type="button"
              onClick={() => navigate("/categories")}
              className="mt-5 rounded-full bg-[var(--theme-primary)] px-5 py-2 text-xs font-bold text-[var(--theme-primary-foreground)]"
            >
              查看全部商品
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}

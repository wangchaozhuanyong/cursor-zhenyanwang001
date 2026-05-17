import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import StorePageHeader from "@/components/store/StorePageHeader";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ProductSortBar from "@/components/ProductSortBar";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useProductStore } from "@/stores/useProductStore";
import type { ProductSortType } from "@/types/product";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getProductGridClassName } from "@/utils/productGridClasses";

export default function NewArrivals() {
  const { themeConfig } = useThemeRuntime();
  const productGridClass = getProductGridClassName(themeConfig.productCardVariant);
  useDocumentTitle("新品上市");
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const { products, loading, error, loadProducts } = useProductStore();
  const [sort, setSort] = useState<ProductSortType>("default");

  useEffect(() => {
    loadProducts({
      is_new: true,
      home_new_arrivals_rule: 1,
      new_arrivals_only_in_stock: siteInfo.newArrivalOnlyInStock !== "0" ? 1 : 0,
      sort: sort === "default" || sort === "newest" ? undefined : sort,
      page: 1,
      pageSize: 50,
    });
  }, [loadProducts, siteInfo.newArrivalOnlyInStock, sort]);

  return (
    <div className="store-bottom-safe min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <StorePageHeader
        title="新品上市"
        titleInlineSlot={
          <div className="flex min-w-0 flex-1 justify-end">
            <ProductSortBar
              hideNewest
              value={sort === "newest" ? "default" : sort}
              onChange={(next) => setSort(next === "newest" ? "default" : next)}
              className="w-full max-w-[min(100%,20rem)]"
            />
          </div>
        }
      />

      <main className="mx-auto max-w-screen-xl px-4 pb-6 pt-4">
        {error ? (
          <div className="mt-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-center text-sm text-[var(--theme-text-muted)]">
            {error}
          </div>
        ) : null}

        <section className={`mt-4 ${productGridClass}`}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((product, index) => (
                <ProductCard key={product.id} product={product} index={index} />
              ))}
        </section>

        {!loading && products.length === 0 ? (
          <section className="mt-4 rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-12 text-center">
            <p className="text-sm font-semibold text-[var(--theme-text)]">暂无新品上市</p>
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

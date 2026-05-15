import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ProductSortBar from "@/components/ProductSortBar";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useProductStore } from "@/stores/useProductStore";
import type { ProductSortType } from "@/types/product";

export default function NewArrivals() {
  useDocumentTitle("新品上市");
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const { products, loading, error, loadProducts } = useProductStore();
  const [sort, setSort] = useState<ProductSortType>("newest");

  const heroTitle = (siteInfo.newArrivalHeroTitle || "").trim();
  const heroSubtitle = (siteInfo.newArrivalHeroSubtitle || "").trim();
  const heroImage = (siteInfo.newArrivalHeroImage || "").trim();
  const showHero = Boolean(heroImage || heroTitle || heroSubtitle);

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
        {showHero ? (
          <section className="relative flex h-[100px] items-center overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 theme-shadow">
            {heroImage ? <img src={heroImage} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" /> : null}
            {heroImage ? <div className="absolute inset-0 bg-black/25" /> : null}
            <div className="relative min-w-0">
              {heroTitle ? <h1 className="truncate text-lg font-black text-white">{heroTitle}</h1> : null}
              {heroSubtitle ? <p className="mt-1 truncate text-xs font-medium text-white/85">{heroSubtitle}</p> : null}
            </div>
          </section>
        ) : null}

        <section className={showHero ? "mt-4" : ""}>
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

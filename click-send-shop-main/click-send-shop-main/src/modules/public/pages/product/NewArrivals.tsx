import { useEffect, useState } from "react";
import { Search, SlidersHorizontal, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/PageHeader";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useProductStore } from "@/stores/useProductStore";
import type { ProductSortType } from "@/types/product";

const sortOptions: Array<{ value: ProductSortType; label: string }> = [
  { value: "newest", label: "最新" },
  { value: "default", label: "综合" },
  { value: "price-asc", label: "价格↑" },
  { value: "price-desc", label: "价格↓" },
];

export default function NewArrivals() {
  useDocumentTitle("新品上市");
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const { products, loading, error, loadProducts } = useProductStore();
  const [sort, setSort] = useState<ProductSortType>("newest");

  const heroTitle = (siteInfo.newArrivalHeroTitle || "").trim() || "新品上市";
  const heroSubtitle = (siteInfo.newArrivalHeroSubtitle || "").trim() || "最新上架好物，按 1:1 商品图统一浏览";
  const heroImage = (siteInfo.newArrivalHeroImage || "").trim();

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
        <section className="relative overflow-hidden rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-5 theme-shadow">
          {heroImage ? (
            <img
              src={heroImage}
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-15 blur-xl scale-110"
            />
          ) : null}
          <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-[color-mix(in_srgb,var(--theme-price)_18%,transparent)] blur-2xl" />
          <div className="relative">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--theme-price)_14%,transparent)] px-3 py-1 text-[11px] font-bold text-[var(--theme-price)]">
              <Sparkles size={13} />
              New Arrival
            </div>
            <h1 className="mt-3 text-2xl font-black text-[var(--theme-text-on-surface)]">{heroTitle}</h1>
            <p className="mt-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">{heroSubtitle}</p>
          </div>
        </section>

        <section className="mt-4 flex items-center gap-2">
          <SlidersHorizontal size={14} className="text-muted-foreground" />
          {sortOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setSort(option.value)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${
                sort === option.value
                  ? "bg-[var(--theme-primary)] text-[var(--theme-primary-foreground)]"
                  : "border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text-muted)]"
              }`}
            >
              {option.label}
            </button>
          ))}
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

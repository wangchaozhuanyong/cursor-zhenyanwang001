import { useState, useEffect, useCallback, useRef } from "react";
import { ArrowLeft, SlidersHorizontal } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useProductStore } from "@/stores/useProductStore";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import type { ProductSortType } from "@/types/product";

export default function Categories() {
  const navigate = useNavigate();
  const goBack = useGoBack();
  const [searchParams] = useSearchParams();
  const [activeCat, setActiveCat] = useState(searchParams.get("cat") || "all");
  const [sort, setSort] = useState<ProductSortType>("default");
  const [query, setQuery] = useState("");

  const {
    products,
    categories,
    loading,
    error,
    loadProducts,
    loadCategories,
  } = useProductStore();

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    loadProducts({
      category_id: activeCat === "all" ? undefined : activeCat,
      keyword: query || undefined,
      sort: sort === "default" ? undefined : sort,
      page: 1,
      pageSize: 50,
    });
  }, [activeCat, sort, query, loadProducts]);

  const handleCatChange = useCallback((id: string) => {
    setActiveCat(id);
  }, []);

  const categoryBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const categoryRow = [{ id: "all", name: "全部", icon: "" }, ...categories];

  useEffect(() => {
    const btn = categoryBtnRefs.current.get(activeCat);
    btn?.scrollIntoView({
      behavior: "smooth",
      inline: "center",
      block: "nearest",
    });
  }, [activeCat, categories.length]);

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)] pb-20">
      <header className="sticky top-0 z-40 bg-[var(--theme-surface)]/95 backdrop-blur-md border-b border-[var(--theme-border)]">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary touch-target">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索商品..."
            className="flex-1 rounded-full bg-[var(--theme-bg)] border border-[var(--theme-border)] px-4 py-2 text-sm text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-text-muted)]"
          />
        </div>
      </header>

      <main className="mx-auto max-w-lg">
        {/* Category tabs */}
        <div className="no-scrollbar flex gap-2 overflow-x-auto px-4 py-2">
          {loading && categories.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-8 w-16 flex-shrink-0 rounded-full" />
              ))
            : categoryRow.map((cat) => (
                <button
                  key={cat.id}
                  ref={(el) => {
                    if (el) categoryBtnRefs.current.set(cat.id, el);
                    else categoryBtnRefs.current.delete(cat.id);
                  }}
                  onClick={() => handleCatChange(cat.id)}
                  className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
                    activeCat === cat.id
                      ? "bg-[var(--theme-primary)] text-white"
                      : "bg-[var(--theme-surface)] text-[var(--theme-text)] border border-[var(--theme-border)]"
                  }`}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2 px-4 py-2">
          <SlidersHorizontal size={14} className="text-muted-foreground" />
          {(["default", "price-asc", "price-desc"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`text-xs ${sort === s ? "font-semibold text-gold" : "text-muted-foreground"}`}
            >
              {s === "default" ? "综合" : s === "price-asc" ? "价格↑" : "价格↓"}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && (
          <div className="mx-4 mb-3 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Products */}
        <div className="grid grid-cols-2 gap-3 px-4 pb-4">
          {loading
            ? Array.from({ length: 6 }).map((_, i) => <ProductCardSkeleton key={i} />)
            : products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
          {!loading && products.length === 0 && (
            <div className="col-span-2 py-20 text-center text-muted-foreground">
              暂无商品
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

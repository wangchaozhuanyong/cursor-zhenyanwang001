import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useGoBack } from "@/hooks/useGoBack";
import { useProductStore } from "@/stores/useProductStore";
import { useNotificationStore } from "@/stores/useNotificationStore";
import NotificationIconButton from "@/components/NotificationIconButton";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ProductFilterDrawer from "@/components/ProductFilterDrawer";
import ProductSortBar from "@/components/ProductSortBar";
import CategorySideTree from "@/components/CategorySideTree";
import { Skeleton } from "@/components/ui/skeleton";
import * as productService from "@/services/productService";
import type { ProductSortType, ProductTag } from "@/types/product";
import type { Category } from "@/types/category";
import { findCategoryById, findImmediateParentId, findRootCategoryIdForActive, isCategoryOrDescendantActive } from "@/utils/categoryTree";
import { trackEvent } from "@/services/analyticsService";
import { toast } from "sonner";

export default function Categories() {
  const goBack = useGoBack();
  const navigate = useNavigate();
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  const fetchUnreadCount = useNotificationStore((s) => s.fetchUnreadCount);
  const [searchParams, setSearchParams] = useSearchParams();

  const [activeCat, setActiveCat] = useState(searchParams.get("cat") || "all");
  const [activeTagId, setActiveTagId] = useState(searchParams.get("tag_id") || "");
  const [quickTags, setQuickTags] = useState<ProductTag[]>([]);
  const [sort, setSort] = useState<ProductSortType>(normalizeSort(searchParams.get("sort")));
  const [query, setQuery] = useState(searchParams.get("keyword") || "");
  const [debouncedQuery, setDebouncedQuery] = useState(searchParams.get("keyword") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [inStock, setInStock] = useState(searchParams.get("in_stock") === "1");
  const [isNew, setIsNew] = useState(searchParams.get("is_new") === "1");
  const [isHot, setIsHot] = useState(searchParams.get("is_hot") === "1");
  const [isRecommended, setIsRecommended] = useState(searchParams.get("is_recommended") === "1");
  const [expandedParentId, setExpandedParentId] = useState<string | null>(null);

  const { products, categories, loading, error, loadProducts, loadCategories } = useProductStore();

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { fetchUnreadCount(); }, [fetchUnreadCount]);
  useEffect(() => { productService.fetchProductTags(20).then(setQuickTags).catch(() => setQuickTags([])); }, []);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedQuery(query.trim()), 300);
    return () => window.clearTimeout(t);
  }, [query]);

  const syncQuery = useCallback(() => {
    const next = new URLSearchParams();
    if (activeCat && activeCat !== "all") next.set("cat", activeCat);
    if (activeTagId) next.set("tag_id", activeTagId);
    if (minPrice) next.set("min_price", minPrice);
    if (maxPrice) next.set("max_price", maxPrice);
    if (inStock) next.set("in_stock", "1");
    if (isNew) next.set("is_new", "1");
    if (isHot) next.set("is_hot", "1");
    if (isRecommended) next.set("is_recommended", "1");
    if (sort && sort !== "default") next.set("sort", sort);
    if (debouncedQuery) next.set("keyword", debouncedQuery);
    setSearchParams(next, { replace: true });
  }, [activeCat, activeTagId, debouncedQuery, inStock, isHot, isNew, isRecommended, maxPrice, minPrice, setSearchParams, sort]);

  useEffect(() => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    if (min !== undefined && max !== undefined && min > max) return;
    syncQuery();
    loadProducts({
      category_id: activeCat === "all" ? undefined : activeCat,
      tag_id: activeTagId || undefined,
      keyword: debouncedQuery || undefined,
      is_new: isNew ? true : undefined,
      is_hot: isHot ? true : undefined,
      is_recommended: isRecommended ? true : undefined,
      in_stock: inStock ? true : undefined,
      min_price: min,
      max_price: max,
      sort: sort === "default" ? undefined : sort,
      include_descendants: true,
      page: 1,
      pageSize: 50,
    });
  }, [activeCat, activeTagId, debouncedQuery, inStock, isHot, isNew, isRecommended, loadProducts, maxPrice, minPrice, sort, syncQuery]);

  useEffect(() => {
    const cat = searchParams.get("cat");
    if (!cat || cat === "all" || categories.length === 0) return;
    const parentId = findImmediateParentId(categories, cat);
    if (parentId) setExpandedParentId(parentId);
  }, [searchParams, categories]);

  const handleSelectChild = useCallback((parentId: string, childId: string) => { void trackEvent({ event_type: "category_click", module: "categories", category_id: childId }); setActiveCat(childId); setExpandedParentId(parentId); }, []);
  const handleRootCategoryClick = useCallback((cat: Category) => {
    const children = cat.children?.filter(Boolean) ?? [];
    if (children.length === 0) { void trackEvent({ event_type: "category_click", module: "categories", category_id: cat.id }); setActiveCat(cat.id); setExpandedParentId(null); return; }
    if (expandedParentId === cat.id) { setExpandedParentId(null); return; }
    setExpandedParentId(cat.id); setActiveCat(cat.id);
  }, [expandedParentId]);

  const clearFilters = useCallback(() => {
    setActiveTagId(""); setSort("default"); setQuery(""); setMinPrice(""); setMaxPrice(""); setInStock(false); setIsNew(false); setIsHot(false); setIsRecommended(false);
  }, []);

  const handleSelectAll = useCallback(() => { setActiveCat("all"); setExpandedParentId(null); }, []);

  const categoryBtnRefs = useRef<Map<string, HTMLButtonElement>>(new Map());
  const rootRow: Array<{ kind: "all" } | { kind: "root"; node: Category }> = [{ kind: "all" }, ...categories.map((node) => ({ kind: "root" as const, node }))];

  const expandedNode = expandedParentId ? findCategoryById(categories, expandedParentId) : null;
  const subCategories = expandedNode?.children?.filter(Boolean) ?? [];
  const scrollTabKey = activeCat === "all" ? "all" : findRootCategoryIdForActive(categories, activeCat) ?? activeCat;

  useEffect(() => { const btn = categoryBtnRefs.current.get(scrollTabKey); btn?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); }, [scrollTabKey, categories.length]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (activeTagId) c++;
    if (minPrice) c++;
    if (maxPrice) c++;
    if (inStock) c++;
    if (isNew) c++;
    if (isHot) c++;
    if (isRecommended) c++;
    return c;
  }, [activeTagId, inStock, isHot, isNew, isRecommended, maxPrice, minPrice]);

  const filterSummary = [
    activeTagId ? "标签" : "",
    minPrice || maxPrice ? `价格 ${minPrice || "0"}-${maxPrice || "∞"}` : "",
    inStock ? "有库存" : "",
    isNew ? "新品" : "",
    isHot ? "热销" : "",
    isRecommended ? "推荐" : "",
  ].filter(Boolean).join(" · ");

  return (
    <div className="min-h-screen bg-[var(--theme-bg)] pb-20 text-[var(--theme-text)]">
      <header className="sticky top-0 z-40 border-b border-[var(--theme-border)] bg-[var(--theme-surface)]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-lg items-center gap-3 px-4 py-3">
          <button onClick={goBack} className="touch-target flex h-10 w-10 items-center justify-center rounded-full hover:bg-secondary"><ArrowLeft size={20} className="text-foreground" /></button>
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="搜索商品..." className="flex-1 rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] px-4 py-2 text-sm text-[var(--theme-text)] outline-none placeholder:text-[var(--theme-text-muted)]" />
          <NotificationIconButton unreadCount={unreadCount} onClick={() => navigate("/notifications")} />
        </div>
      </header>

      <main className="mx-auto max-w-screen-xl">
        <div className="no-scrollbar flex gap-2 overflow-x-auto border-b border-[var(--theme-border)] px-4 py-3 md:hidden">
          {loading && categories.length === 0 ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-16 flex-shrink-0 rounded-full" />) : rootRow.map((item) => {
            if (item.kind === "all") {
              return <button key="all" ref={(el) => { if (el) categoryBtnRefs.current.set("all", el); else categoryBtnRefs.current.delete("all"); }} type="button" onClick={handleSelectAll} className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium ${activeCat === "all" ? "bg-[var(--theme-primary)] text-white" : "border border-[var(--theme-border)] bg-[var(--theme-surface)]"}`}>全部</button>;
            }
            const { node } = item;
            const hasChildren = (node.children?.length ?? 0) > 0;
            const isActive = isCategoryOrDescendantActive(node, activeCat);
            const isExpanded = expandedParentId === node.id;
            return (
              <button key={node.id} ref={(el) => { if (el) categoryBtnRefs.current.set(node.id, el); else categoryBtnRefs.current.delete(node.id); }} type="button" onClick={() => handleRootCategoryClick(node)} className={`flex shrink-0 items-center gap-0.5 rounded-full px-4 py-1.5 text-xs font-medium ${isActive ? "bg-[var(--theme-primary)] text-white" : "border border-[var(--theme-border)] bg-[var(--theme-surface)]"}`}>
                <span className="max-w-[9.5rem] truncate">{node.name}</span>
                {hasChildren ? <ChevronDown size={14} className={`shrink-0 opacity-80 transition-transform ${isExpanded ? "rotate-180" : ""}`} /> : null}
              </button>
            );
          })}
        </div>

        {subCategories.length > 0 ? <div className="border-b border-[var(--theme-border)] px-4 py-3"><div className="flex flex-wrap gap-2">{subCategories.map((child) => <button key={child.id} type="button" onClick={() => handleSelectChild(expandedNode.id, child.id)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${activeCat === child.id ? "bg-[var(--theme-price)] text-[var(--theme-price-foreground)]" : "border border-[var(--theme-border)] bg-[var(--theme-surface)]"}`}>{child.name}</button>)}</div></div> : null}

        <div className="px-4 pb-6 pt-3 md:px-6">
          <div className="md:grid md:grid-cols-[260px,1fr] md:gap-6 lg:grid-cols-[288px,1fr]">
            <CategorySideTree categories={categories} activeCat={activeCat} expandedParentId={expandedParentId} onSelectAll={handleSelectAll} onRootClick={handleRootCategoryClick} onChildClick={handleSelectChild} />
            <section>
              <div className="mb-3 flex items-center gap-3">
                <ProductSortBar value={sort} onChange={setSort} />
                <ProductFilterDrawer
                  activeFilterCount={activeFilterCount}
                  onReset={clearFilters}
                  onConfirm={() => {
                    const min = minPrice ? Number(minPrice) : undefined;
                    const max = maxPrice ? Number(maxPrice) : undefined;
                    if (min !== undefined && max !== undefined && min > max) {
                      toast.error("最低价不能大于最高价");
                      return false;
                    }
                    syncQuery();
                  }}
                >
                  <div className="space-y-3 text-sm">
                    <div>
                      <p className="mb-1 text-xs font-semibold">价格区间</p>
                      <div className="grid grid-cols-2 gap-2">
                        <input value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="最低价" className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs" />
                        <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="最高价" className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[{ k: inStock, t: "只看有库存", f: setInStock }, { k: isNew, t: "新品", f: setIsNew }, { k: isHot, t: "热销", f: setIsHot }, { k: isRecommended, t: "推荐", f: setIsRecommended }].map((it) => (
                        <button key={it.t} type="button" onClick={() => it.f(!it.k)} className={`rounded-xl border px-3 py-2 text-xs ${it.k ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/10" : "border-[var(--theme-border)]"}`}>{it.t}</button>
                      ))}
                    </div>
                    <div>
                      <p className="mb-1 text-xs font-semibold">商品标签</p>
                      {quickTags.length > 0 ? <div className="flex flex-wrap gap-2">{quickTags.map((tag) => { const active = activeTagId === tag.id; return <button key={tag.id} type="button" onClick={() => setActiveTagId(active ? "" : tag.id)} className={`rounded-full border px-3 py-1.5 text-xs ${active ? "ring-2 ring-[var(--theme-price)]/30" : ""}`} style={{ backgroundColor: active ? tag.bg_color || "#FEF3C7" : "var(--theme-surface)", borderColor: tag.bg_color || "var(--theme-border)", color: active ? tag.text_color || "#92400E" : "var(--theme-text)" }}>{tag.name}</button>; })}</div> : <p className="text-xs text-[var(--theme-text-muted)]">暂无可用标签，请先在后台给商品绑定标签</p>}
                    </div>
                  </div>
                </ProductFilterDrawer>
              </div>

              {filterSummary ? <div className="mb-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[var(--theme-text-muted)]">当前筛选：{filterSummary}</div> : null}

              {error && <div className="mb-3 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div>}

              <div className="grid grid-cols-2 gap-4 pt-1 md:grid-cols-3 lg:grid-cols-4">
                {loading ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />) : products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                {!loading && products.length === 0 ? <div className="col-span-2 py-12 text-center text-muted-foreground md:col-span-3 lg:col-span-4"><p>{activeFilterCount > 0 || debouncedQuery ? "当前筛选条件无结果" : activeCat !== "all" ? "当前分类暂无商品" : categories.length > 0 ? "暂无商品上架" : "后台还没有配置商品"}</p>{(activeFilterCount > 0 || debouncedQuery) ? <button type="button" onClick={clearFilters} className="mt-3 rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs">清空筛选</button> : null}</div> : null}
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function normalizeSort(value: string | null): ProductSortType {
  if (value === "sales" || value === "newest" || value === "price-asc" || value === "price-desc") return value;
  return "default";
}

import { useState, useEffect, useCallback, useRef, useMemo, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import StorePageHeader from "@/components/store/StorePageHeader";
import StoreSearchField from "@/components/store/StoreSearchField";
import ProductCard from "@/components/ProductCard";
import { AnimatePresence, motion } from "framer-motion";
import { useMotionConfig } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";
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

  const filterDrawer = (
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
          <p className="mb-1 text-xs font-semibold text-[var(--theme-text)]">价格区间</p>
          <div className="grid grid-cols-2 gap-2">
            <input value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="最低价" className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs text-[var(--theme-text)]" />
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="最高价" className="rounded-xl border border-[var(--theme-border)] bg-[var(--theme-bg)] px-3 py-2 text-xs text-[var(--theme-text)]" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[{ k: inStock, t: "只看有库存", f: setInStock }, { k: isNew, t: "新品", f: setIsNew }, { k: isHot, t: "热销", f: setIsHot }, { k: isRecommended, t: "推荐", f: setIsRecommended }].map((it) => (
            <button key={it.t} type="button" onClick={() => it.f(!it.k)} className={`rounded-xl border px-3 py-2 text-xs ${it.k ? "border-[var(--theme-primary)] bg-[var(--theme-primary)]/10 text-[var(--theme-text)]" : "border-[var(--theme-border)] text-[var(--theme-text)]"}`}>{it.t}</button>
          ))}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-[var(--theme-text)]">商品标签</p>
          {quickTags.length > 0 ? <div className="flex flex-wrap gap-2">{quickTags.map((tag) => { const active = activeTagId === tag.id; return <button key={tag.id} type="button" onClick={() => setActiveTagId(active ? "" : tag.id)} className={`rounded-full border px-3 py-1.5 text-xs ${active ? "ring-2 ring-[var(--theme-price)]/30" : ""}`} style={{ backgroundColor: active ? tag.bg_color || "#FEF3C7" : "var(--theme-surface)", borderColor: tag.bg_color || "var(--theme-border)", color: active ? tag.text_color || "#92400E" : "var(--theme-text)" }}>{tag.name}</button>; })}</div> : <p className="text-xs text-[var(--theme-text-muted)]">暂无可用标签，请先在后台给商品绑定标签</p>}
        </div>
      </div>
    </ProductFilterDrawer>
  );

  return (
    <div className="store-bottom-safe min-h-screen bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <StorePageHeader
        title="分类"
        titleInlineSlot={
          <StoreSearchField
            mode="filter"
            placeholder="搜索商品..."
            value={query}
            onValueChange={setQuery}
          />
        }
        bottomSlot={
          <div className="space-y-2">
            <div className="no-scrollbar -mx-1 flex gap-1.5 overflow-x-auto pb-0.5 md:hidden">

          {loading && categories.length === 0 ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-8 w-16 flex-shrink-0 rounded-full" />) : rootRow.map((item) => {
            if (item.kind === "all") {
              return (
                <CategoryTabButton
                  key="all"
                  btnRef={(el) => { if (el) categoryBtnRefs.current.set("all", el); else categoryBtnRefs.current.delete("all"); }}
                  active={activeCat === "all"}
                  onClick={handleSelectAll}
                  layoutId="category-root-tab"
                >
                  全部
                </CategoryTabButton>
              );
            }
            const { node } = item;
            const hasChildren = (node.children?.length ?? 0) > 0;
            const isActive = isCategoryOrDescendantActive(node, activeCat);
            const isExpanded = expandedParentId === node.id;
            return (
              <CategoryTabButton
                key={node.id}
                btnRef={(el) => { if (el) categoryBtnRefs.current.set(node.id, el); else categoryBtnRefs.current.delete(node.id); }}
                active={isActive}
                onClick={() => handleRootCategoryClick(node)}
                layoutId="category-root-tab"
                className="flex items-center gap-0.5"
              >
                <span className="max-w-[9.5rem] truncate">{node.name}</span>
                {hasChildren ? <ChevronDown size={14} className={`shrink-0 opacity-80 transition-transform ${isExpanded ? "rotate-180" : ""}`} /> : null}
              </CategoryTabButton>
            );
          })}
        </div>

            {subCategories.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 md:hidden">
                {subCategories.map((child) => (
                  <CategoryTabButton
                    key={child.id}
                    active={activeCat === child.id}
                    onClick={() => handleSelectChild(expandedNode!.id, child.id)}
                    layoutId="category-sub-tab"
                    activeClassName="bg-[var(--theme-price)]"
                    activeTextClass="text-[var(--theme-price-foreground)]"
                    className="px-3"
                  >
                    {child.name}
                  </CategoryTabButton>
                ))}
              </div>
            ) : null}
            <div className="flex items-center gap-2 md:hidden">
              <div className="min-w-0 flex-1">
                <ProductSortBar value={sort} onChange={setSort} />
              </div>
              {filterDrawer}
            </div>
          </div>
        }
      />

      <main className="mx-auto max-w-screen-xl">
        <div className="px-4 pb-6 pt-3 md:px-6">
          <div className="md:grid md:grid-cols-[260px,1fr] md:gap-6 lg:grid-cols-[288px,1fr]">
            <CategorySideTree categories={categories} activeCat={activeCat} expandedParentId={expandedParentId} onSelectAll={handleSelectAll} onRootClick={handleRootCategoryClick} onChildClick={handleSelectChild} />
            <section>
              <div className="mb-3 hidden items-center gap-2 md:flex">
                <div className="min-w-0 flex-1">
                  <ProductSortBar value={sort} onChange={setSort} />
                </div>
                {filterDrawer}
              </div>

              {filterSummary ? <div className="mb-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[var(--theme-text-muted)]">当前筛选：{filterSummary}</div> : null}

              {error && <div className="mb-3 rounded-xl bg-destructive/10 p-3 text-center text-sm text-destructive">{error}</div>}

              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeCat}-${sort}-${loading}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.18 }}
                  className="grid grid-cols-2 gap-4 pt-1 md:grid-cols-3 lg:grid-cols-4"
                >
                {loading ? Array.from({ length: 8 }).map((_, i) => <ProductCardSkeleton key={i} />) : products.map((p, i) => <ProductCard key={p.id} product={p} index={i} />)}
                {!loading && products.length === 0 ? <div className="col-span-2 py-12 text-center text-muted-foreground md:col-span-3 lg:col-span-4"><p>{activeFilterCount > 0 || debouncedQuery ? "当前筛选条件无结果" : activeCat !== "all" ? "当前分类暂无商品" : categories.length > 0 ? "暂无商品上架" : "后台还没有配置商品"}</p>{(activeFilterCount > 0 || debouncedQuery) ? <button type="button" onClick={clearFilters} className="mt-3 rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs">清空筛选</button> : null}</div> : null}
                </motion.div>
              </AnimatePresence>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

const TAB_INDICATOR_SPRING = { type: "spring" as const, stiffness: 380, damping: 32 };

function CategoryTabButton({
  active,
  onClick,
  layoutId,
  children,
  className,
  btnRef,
  activeClassName = "bg-[var(--theme-primary)]",
  activeTextClass = "text-[var(--theme-primary-foreground)]",
}: {
  active: boolean;
  onClick: () => void;
  layoutId: string;
  children: ReactNode;
  className?: string;
  btnRef?: (el: HTMLButtonElement | null) => void;
  activeClassName?: string;
  activeTextClass?: string;
}) {
  const { enabled } = useMotionConfig();
  return (
    <button
      ref={btnRef}
      type="button"
      onClick={onClick}
      className={cn(
        "relative flex-shrink-0 overflow-hidden rounded-full px-4 py-1.5 text-xs font-medium",
        active ? "border border-transparent" : "border border-[var(--theme-border)] bg-[var(--theme-surface)]",
        className,
      )}
    >
      {active ? (
        enabled ? (
          <motion.span
            layoutId={layoutId}
            className={cn("absolute inset-0 rounded-full", activeClassName)}
            transition={TAB_INDICATOR_SPRING}
          />
        ) : (
          <span className={cn("absolute inset-0 rounded-full", activeClassName)} />
        )
      ) : null}
      <span className={cn("relative z-10", active ? activeTextClass : "text-[var(--theme-text)]")}>{children}</span>
    </button>
  );
}

function normalizeSort(value: string | null): ProductSortType {
  if (value === "sales" || value === "newest" || value === "price-asc" || value === "price-desc") return value;
  return "default";
}

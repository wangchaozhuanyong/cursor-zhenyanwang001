import { useState, useEffect, useCallback, useMemo, useLayoutEffect, useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import StorePageHeader from "@/components/store/StorePageHeader";
import { STORE_MOBILE_PAGE_HEADER_CLASS } from "@/constants/storeLayout";
import StoreSearchField from "@/components/store/StoreSearchField";
import { motion } from "framer-motion";
import { useMotionConfig } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";
import ProductFilterDrawer from "@/components/ProductFilterDrawer";
import ProductSortBar from "@/components/ProductSortBar";
import CategoryKingkongRow, { type CategoryKingkongItem } from "@/components/CategoryKingkongRow";
import CategorySideTree from "@/components/CategorySideTree";
import { getCategoryNavIconValue } from "@/utils/categoryNavIcon";
import * as productService from "@/services/productService";
import type { ProductSortType, ProductTag } from "@/types/product";
import type { Category } from "@/types/category";
import { findCategoryById, findRootCategoryIdForActive, isCategoryOrDescendantActive } from "@/utils/categoryTree";
import { trackEvent } from "@/services/analyticsService";
import { toast } from "sonner";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import ProductListViewToggle from "@/components/ProductListViewToggle";
import { useCategoryListView } from "@/hooks/useCategoryListView";
import { getCategoryProductsEmptyColSpan, getCategoryProductsGridClass } from "@/utils/productGridClasses";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import StorefrontLoadErrorPanel from "@/components/store/StorefrontLoadErrorPanel";
import SilkProductGrid from "@/components/motion/SilkProductGrid";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { renderBrandTitle } from "@/utils/brand";

export default function Categories() {
  const { themeConfig } = useThemeRuntime();
  const siteInfo = useSiteInfo();
  const siteCapabilities = useSiteCapabilities();
  const productCardSiteContext = useMemo(
    () => ({
      restrictedComplianceEnabled: siteCapabilities.restrictedProductComplianceEnabled,
      siteInfo,
    }),
    [siteCapabilities.restrictedProductComplianceEnabled, siteInfo],
  );
  const { viewMode, setViewMode } = useCategoryListView();
  const [searchParams, setSearchParams] = useSearchParams();
  const productGridClass = getCategoryProductsGridClass(viewMode, themeConfig.productCardVariant);
  const emptyColSpan = getCategoryProductsEmptyColSpan(viewMode, themeConfig.productCardVariant);
  const isListView = viewMode === "list";

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
  const { products, categories, loading, listRefreshing, error, loadProducts, loadCategories } = useProductStore();

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
    if (next.toString() === searchParams.toString()) return;
    setSearchParams(next, { replace: true });
  }, [activeCat, activeTagId, debouncedQuery, inStock, isHot, isNew, isRecommended, maxPrice, minPrice, searchParams, setSearchParams, sort]);

  useEffect(() => {
    syncQuery();
  }, [syncQuery]);

  useEffect(() => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    if (min !== undefined && max !== undefined && min > max) return;
    void loadProducts({
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
      pageSize: 24,
    });
  }, [activeCat, activeTagId, debouncedQuery, inStock, isHot, isNew, isRecommended, loadProducts, maxPrice, minPrice, sort]);

  const handleSelectChild = useCallback((childId: string) => {
    void trackEvent({ event_type: "category_click", module: "categories", category_id: childId });
    setActiveCat(childId);
  }, []);

  const handleRootCategoryClick = useCallback((cat: Category) => {
    void trackEvent({ event_type: "category_click", module: "categories", category_id: cat.id });
    setActiveCat(cat.id);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveTagId(""); setSort("default"); setQuery(""); setMinPrice(""); setMaxPrice(""); setInStock(false); setIsNew(false); setIsHot(false); setIsRecommended(false);
  }, []);

  const handleSelectAll = useCallback(() => { setActiveCat("all"); }, []);

  const rootRow: Array<{ kind: "all" } | { kind: "root"; node: Category }> = [{ kind: "all" }, ...categories.map((node) => ({ kind: "root" as const, node }))];

  const activeRootId = useMemo(() => {
    if (activeCat === "all") return null;
    return findRootCategoryIdForActive(categories, activeCat);
  }, [activeCat, categories]);

  const subCategories = useMemo(() => {
    if (!activeRootId) return [];
    const root = findCategoryById(categories, activeRootId);
    return root?.children?.filter(Boolean) ?? [];
  }, [activeRootId, categories]);
  const scrollTabKey = activeCat === "all" ? "all" : findRootCategoryIdForActive(categories, activeCat) ?? activeCat;

  const rootKingkongItems = useMemo((): CategoryKingkongItem[] => {
    const row: typeof rootRow = [{ kind: "all" }, ...categories.map((node) => ({ kind: "root" as const, node }))];
    return row.map((item) => {
      if (item.kind === "all") {
        return {
          id: "all",
          label: "全部",
          iconValue: "📋",
          active: activeCat === "all",
          onClick: handleSelectAll,
        };
      }
      const { node } = item;
      return {
        id: node.id,
        label: node.name,
        iconValue: getCategoryNavIconValue(node),
        active: isCategoryOrDescendantActive(node, activeCat),
        onClick: () => handleRootCategoryClick(node),
      };
    });
  }, [activeCat, categories, handleRootCategoryClick, handleSelectAll]);

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
  const hasComplexParams = Boolean(
    searchParams.get("keyword")
    || searchParams.get("sort")
    || searchParams.get("tag_id")
    || searchParams.get("min_price")
    || searchParams.get("max_price")
    || searchParams.get("in_stock")
    || searchParams.get("is_new")
    || searchParams.get("is_hot")
    || searchParams.get("is_recommended")
    || searchParams.get("page"),
  );
  const activeCategory = useMemo(() => (activeCat === "all" ? null : findCategoryById(categories, activeCat)), [activeCat, categories]);
  const activeCategoryName = activeCategory?.name || "";
  const categoryDescription = activeCategory?.description?.trim() || "";
  const siteName = (siteInfo.siteName || "官方商城").trim();
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const pageHeading = activeCategoryName || "全部分类";
  const title = activeCategory?.seo_title?.trim() || (activeCategoryName ? `${activeCategoryName}｜${siteName}` : `全部分类｜${siteName}`);
  const description = activeCategory?.seo_description?.trim() || (activeCategoryName
    ? categoryDescription || `查看${siteName}${activeCategoryName}分类，发现更多相关商品和服务。`
    : `查看${siteName}全部分类，快速找到更多商品和服务。`);
  const robots = hasComplexParams ? "noindex,follow" : "index,follow";
  const canonical = activeCategoryName ? buildCanonical("/categories", `cat=${activeCat}`, { keepParams: ["cat"] }) : buildCanonical("/categories");
  const showFullSkeleton = loading && products.length === 0;
  const showSoftRefreshing = listRefreshing && products.length > 0;

  const mobileChromeRef = useRef<HTMLDivElement>(null);
  const [mobileChromeHeight, setMobileChromeHeight] = useState(0);

  useLayoutEffect(() => {
    const node = mobileChromeRef.current;
    if (!node) return;

    const update = () => {
      setMobileChromeHeight(node.offsetHeight || 0);
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener("resize", update);

    return () => {
      observer.disconnect();
      window.removeEventListener("resize", update);
    };
  }, [categories.length, subCategories.length, activeFilterCount, viewMode, loading]);

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
            <input value={minPrice} onChange={(e) => setMinPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="最低价" className="store-category-filter-input rounded-xl border px-3 py-2 text-xs" />
            <input value={maxPrice} onChange={(e) => setMaxPrice(e.target.value.replace(/[^\d.]/g, ""))} placeholder="最高价" className="store-category-filter-input rounded-xl border px-3 py-2 text-xs" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {[{ k: inStock, t: "只看有库存", f: setInStock }, { k: isNew, t: "新品", f: setIsNew }, { k: isHot, t: "热销", f: setIsHot }, { k: isRecommended, t: "推荐", f: setIsRecommended }].map((it) => (
            <button key={it.t} type="button" onClick={() => it.f(!it.k)} className={cn("store-category-filter-chip rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]", it.k && "is-active")}>{it.t}</button>
          ))}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-[var(--theme-text)]">商品标签</p>
          {quickTags.length > 0 ? <div className="flex flex-wrap gap-2">{quickTags.map((tag) => { const active = activeTagId === tag.id; return <button key={tag.id} type="button" onClick={() => setActiveTagId(active ? "" : tag.id)} className={`rounded-full border px-3 py-1.5 text-xs ${active ? "ring-2 ring-[var(--theme-price)]/30" : ""}`} style={{ backgroundColor: active ? tag.bg_color || "#FEF3C7" : "var(--theme-surface)", borderColor: tag.bg_color || "var(--theme-border)", color: active ? tag.text_color || "#92400E" : "var(--theme-text)" }}>{tag.name}</button>; })}</div> : <p className="text-xs text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]">暂无可用标签，请先在后台给商品绑定标签</p>}
        </div>
      </div>
    </ProductFilterDrawer>
  );

  const categoryHeaderTitle = (
    <span className="store-category-brand">
      {logoSrc ? (
        <img
          src={logoSrc}
          alt={`${siteName} Logo`}
          width={38}
          height={38}
          className="store-category-brand-logo"
          loading="eager"
          decoding="async"
        />
      ) : (
        <span className="store-category-brand-logo store-category-brand-logo--fallback" aria-hidden>
          {siteName.slice(0, 1)}
        </span>
      )}
      <span className="store-category-brand-name">{renderBrandTitle(siteName)}</span>
    </span>
  );

  const mobileCategoryBottomSlot = (
    <>
      <div className="space-y-2 pb-2">
        <CategoryKingkongRow
          items={rootKingkongItems}
          scrollKey={scrollTabKey}
          loading={loading && categories.length === 0}
          className="store-category-showcase -mx-[var(--store-page-x)] rounded-none border-x-0"
        />
        {subCategories.length > 0 ? (
          <div className="store-category-subtabs flex flex-wrap gap-1.5">
            {subCategories.map((child) => (
              <CategoryTabButton
                key={child.id}
                active={activeCat === child.id}
                onClick={() => handleSelectChild(child.id)}
                layoutId="category-sub-tab"
                activeClassName="bg-[var(--theme-price)]"
                activeTextClass="text-[var(--theme-price-foreground)]"
                className="store-category-subtab px-3"
              >
                {child.name}
              </CategoryTabButton>
            ))}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-2 border-t border-[color-mix(in_srgb,var(--theme-border)_65%,transparent)] pb-2.5 pt-2">
        <div className="min-w-0 flex-1">
          <ProductSortBar value={sort} onChange={setSort} />
        </div>
        <ProductListViewToggle value={viewMode} onChange={setViewMode} />
        {filterDrawer}
      </div>
    </>
  );

  return (
    <div className="store-page-shell store-listing-page store-category-page store-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <SeoHead
        title={title}
        description={description}
        canonical={canonical}
        robots={robots}
      />
      <div
        ref={mobileChromeRef}
        className={cn(
          "fixed inset-x-0 top-0 z-header md:hidden",
          "transition-[transform,opacity] duration-200 ease-out will-change-transform motion-reduce:transition-none",
          "translate-y-0 opacity-100",
        )}
      >
        <StorePageHeader
          sticky={false}
          className={cn(STORE_MOBILE_PAGE_HEADER_CLASS, "store-category-mobile-header")}
          title={categoryHeaderTitle}
          titleInlineSlot={
            <StoreSearchField
              mode="filter"
              placeholder="搜索商品..."
              value={query}
              onValueChange={setQuery}
              className="store-category-search-field"
            />
          }
          bottomSlot={mobileCategoryBottomSlot}
        />
      </div>
      <div
        className="md:hidden"
        style={{ height: mobileChromeHeight > 0 ? mobileChromeHeight : undefined }}
        aria-hidden
      />

      <main className="store-category-main mx-auto max-w-screen-xl">
        <div className="px-[var(--store-page-x)] pb-6 pt-[var(--store-page-y)] md:px-6">
          <div className="md:grid md:grid-cols-[260px,1fr] md:gap-6 lg:grid-cols-[288px,1fr]">
            <CategorySideTree categories={categories} activeCat={activeCat} onSelectAll={handleSelectAll} onRootClick={handleRootCategoryClick} onChildClick={handleSelectChild} />
            <section className="store-category-content min-w-0">
              <div className="store-category-desktop-title mb-4 hidden rounded-3xl border px-5 py-4 md:block">
                <p className="text-xs font-semibold tracking-[0.22em] text-[var(--theme-text-muted)]">分类目录</p>
                <h1 className="mt-1 text-2xl font-black tracking-tight text-[var(--theme-text)]">{pageHeading}</h1>
                {categoryDescription ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">{categoryDescription}</p>
                ) : null}
              </div>

              <div className="store-category-toolbar mb-3 hidden items-center gap-2 md:flex">
                <div className="min-w-0 flex-1">
                  <ProductSortBar value={sort} onChange={setSort} />
                </div>
                <ProductListViewToggle value={viewMode} onChange={setViewMode} />
                {filterDrawer}
              </div>

              {filterSummary ? <div className="store-filter-summary mb-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]">当前筛选：{filterSummary}</div> : null}

              {error && products.length === 0 ? (
                <div className="mb-3">
                  <StorefrontLoadErrorPanel
                    message={error}
                    compact
                    onRetry={() => {
                      useProductStore.getState().clearError();
                      void loadProducts();
                      void loadCategories();
                    }}
                  />
                </div>
              ) : null}
              {error && products.length > 0 ? (
                <p className={`mb-3 px-3 py-2 text-center text-xs ${THEME_ALERT_ERROR_SOFT}`}>
                  商品列表暂时无法刷新，以下为缓存数据
                </p>
              ) : null}

              <SilkProductGrid
                products={products}
                className={productGridClass}
                displayMode={isListView ? "list" : "theme"}
                skeletonCount={8}
                siteContext={productCardSiteContext}
                showFullSkeleton={showFullSkeleton}
                showSoftRefreshing={showSoftRefreshing}
                emptyState={
                  !error ? (
                  <div className={cn(emptyColSpan, "store-listing-empty py-12 text-center text-muted-foreground")}>
                    <p>
                      {activeFilterCount > 0 || debouncedQuery
                        ? "当前筛选条件无结果"
                        : activeCat !== "all"
                          ? "当前分类暂无商品"
                          : "暂无商品上架"}
                    </p>
                    {(activeFilterCount > 0 || debouncedQuery) ? (
                      <button type="button" onClick={clearFilters} className="mt-3 rounded-full border border-[var(--theme-border)] px-4 py-2 text-xs">
                        清空筛选
                      </button>
                    ) : null}
                  </div>
                  ) : null
                }
              />
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

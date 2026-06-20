import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { LayoutGrid, Search, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { useProductStore } from "@/stores/useProductStore";
import { STORE_COPY } from "@/constants/storeCopy";
import { cn } from "@/lib/utils";
import ProductFilterDrawer from "@/components/ProductFilterDrawer";
import ProductSortBar from "@/components/ProductSortBar";
import CategoryKingkongRow, { type CategoryKingkongItem } from "@/components/CategoryKingkongRow";
import CategorySubcategoryRail from "@/components/store/CategorySubcategoryRail";
import { getCategoryNavIconValue } from "@/utils/categoryNavIcon";
import * as productService from "@/services/productService";
import type { ProductSortType, ProductTag } from "@/types/product";
import type { Category } from "@/types/category";
import { findCategoryById, findRootCategoryIdForActive, isCategoryOrDescendantActive } from "@/utils/categoryTree";
import { trackEvent } from "@/services/analyticsService";
import { toast } from "sonner";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useClientDesignStyle } from "@/modules/storefront-v2/design/useClientDesignStyle";
import ProductListViewToggle from "@/components/ProductListViewToggle";
import { useCategoryListView } from "@/hooks/useCategoryListView";
import { getCategoryProductsEmptyColSpan, getCategoryProductsGridClass } from "@/utils/productGridClasses";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";
import { THEME_PREVIEW_PARAM_NAMES } from "@/utils/themePreviewParams";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import StorefrontLoadErrorPanel from "@/components/store/StorefrontLoadErrorPanel";
import SilkProductGrid from "@/components/motion/SilkProductGrid";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { ClientButton, EmptyState as ClientEmptyState } from "@/components/client";
import { hasMorePaginatedItems } from "@/lib/pagination";
import { useSmartMobileChrome } from "@/hooks/useSmartMobileChrome";
import {
  NEW_ARRIVAL_CATEGORY_CANONICAL_SEARCH,
  NEW_ARRIVAL_CATEGORY_LABEL,
  isNewArrivalCategoryParams,
} from "@/constants/newArrivalNavigation";

export default function Categories() {
  const { themeConfig } = useThemeRuntime();
  const clientStyle = useClientDesignStyle();
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
  const syncedSearchKeyRef = useRef(searchParams.toString());
  const syncingFromUrlRef = useRef(false);
  const productGridClass = getCategoryProductsGridClass(viewMode, themeConfig.productCardVariant);
  const emptyColSpan = getCategoryProductsEmptyColSpan(viewMode, themeConfig.productCardVariant);
  const isListView = viewMode === "list";

  const initialIsNew = isNewArrivalCategoryParams(searchParams);
  const [activeCat, setActiveCat] = useState(initialIsNew ? "all" : searchParams.get("cat") || "all");
  const [activeTagId, setActiveTagId] = useState(searchParams.get("tag_id") || "");
  const [quickTags, setQuickTags] = useState<ProductTag[]>([]);
  const [sort, setSort] = useState<ProductSortType>(normalizeSort(searchParams.get("sort")));
  const [query, setQuery] = useState(searchParams.get("keyword") || "");
  const [submittedQuery, setSubmittedQuery] = useState(searchParams.get("keyword") || "");
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "");
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "");
  const [inStock, setInStock] = useState(searchParams.get("in_stock") === "1");
  const [isNew, setIsNew] = useState(initialIsNew);
  const [isHot, setIsHot] = useState(searchParams.get("is_hot") === "1");
  const [isRecommended, setIsRecommended] = useState(searchParams.get("is_recommended") === "1");
  const products = useProductStore((s) => s.products);
  const pagination = useProductStore((s) => s.pagination);
  const categories = useProductStore((s) => s.categories);
  const loading = useProductStore((s) => s.loading);
  const listRefreshing = useProductStore((s) => s.listRefreshing);
  const error = useProductStore((s) => s.error);
  const loadProducts = useProductStore((s) => s.loadProducts);
  const loadMoreProducts = useProductStore((s) => s.loadMoreProducts);
  const loadCategories = useProductStore((s) => s.loadCategories);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => { loadCategories(); }, [loadCategories]);
  useEffect(() => { productService.fetchProductTags(20).then(setQuickTags).catch(() => setQuickTags([])); }, []);

  useEffect(() => {
    const currentSearchKey = searchParams.toString();
    if (currentSearchKey === syncedSearchKeyRef.current) return;

    const nextIsNew = isNewArrivalCategoryParams(searchParams);
    const keyword = searchParams.get("keyword") || "";
    syncingFromUrlRef.current = true;
    syncedSearchKeyRef.current = currentSearchKey;
    setActiveCat(nextIsNew ? "all" : searchParams.get("cat") || "all");
    setActiveTagId(searchParams.get("tag_id") || "");
    setSort(normalizeSort(searchParams.get("sort")));
    setQuery(keyword);
    setSubmittedQuery(keyword);
    setMinPrice(searchParams.get("min_price") || "");
    setMaxPrice(searchParams.get("max_price") || "");
    setInStock(searchParams.get("in_stock") === "1");
    setIsNew(nextIsNew);
    setIsHot(searchParams.get("is_hot") === "1");
    setIsRecommended(searchParams.get("is_recommended") === "1");
  }, [searchParams]);

  const syncQuery = useCallback(() => {
    const next = new URLSearchParams();
    THEME_PREVIEW_PARAM_NAMES.forEach((name) => {
      const value = searchParams.get(name)?.trim();
      if (value) next.set(name, value);
    });
    if (activeCat && activeCat !== "all") next.set("cat", activeCat);
    if (activeTagId) next.set("tag_id", activeTagId);
    if (minPrice) next.set("min_price", minPrice);
    if (maxPrice) next.set("max_price", maxPrice);
    if (inStock) next.set("in_stock", "1");
    if (isNew) {
      next.set("is_new", "1");
      next.set("home_new_arrivals_rule", "1");
    }
    if (isHot) next.set("is_hot", "1");
    if (isRecommended) next.set("is_recommended", "1");
    if (sort && sort !== "default") next.set("sort", sort);
    if (submittedQuery) next.set("keyword", submittedQuery);
    const nextSearchKey = next.toString();
    if (nextSearchKey === searchParams.toString()) return;
    syncedSearchKeyRef.current = nextSearchKey;
    setSearchParams(next, { replace: true });
  }, [activeCat, activeTagId, inStock, isHot, isNew, isRecommended, maxPrice, minPrice, searchParams, setSearchParams, sort, submittedQuery]);

  useEffect(() => {
    if (syncingFromUrlRef.current) {
      syncingFromUrlRef.current = false;
      return;
    }
    syncQuery();
  }, [syncQuery]);

  useEffect(() => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    if (min !== undefined && max !== undefined && min > max) return;
    void loadProducts({
      category_id: activeCat === "all" ? undefined : activeCat,
      tag_id: activeTagId || undefined,
      keyword: submittedQuery || undefined,
      is_new: isNew ? true : undefined,
      is_hot: isHot ? true : undefined,
      is_recommended: isRecommended ? true : undefined,
      home_new_arrivals_rule: isNew ? 1 : undefined,
      new_arrivals_only_in_stock: isNew ? (siteInfo.newArrivalOnlyInStock !== "0" ? 1 : 0) : undefined,
      in_stock: inStock ? true : undefined,
      min_price: min,
      max_price: max,
      sort: sort === "default" ? (isNew ? "newest" : undefined) : sort,
      include_descendants: true,
      page: 1,
      pageSize: 24,
    });
  }, [activeCat, activeTagId, inStock, isHot, isNew, isRecommended, loadProducts, maxPrice, minPrice, siteInfo.newArrivalOnlyInStock, sort, submittedQuery]);

  const handleSelectChild = useCallback((childId: string) => {
    void trackEvent({ event_type: "category_click", module: "categories", category_id: childId });
    setIsNew(false);
    setActiveCat(childId);
  }, []);

  const handleRootCategoryClick = useCallback((cat: Category) => {
    void trackEvent({ event_type: "category_click", module: "categories", category_id: cat.id });
    setIsNew(false);
    setActiveCat(cat.id);
  }, []);

  const clearFilters = useCallback(() => {
    setActiveTagId(""); setSort("default"); setQuery(""); setSubmittedQuery(""); setMinPrice(""); setMaxPrice(""); setInStock(false); setIsNew(false); setIsHot(false); setIsRecommended(false);
  }, []);

  const handleTopSearchSubmit = useCallback((nextValue?: string) => {
    setSubmittedQuery((nextValue ?? query).trim());
  }, [query]);

  const handleClearTopSearch = useCallback(() => {
    setQuery("");
    setSubmittedQuery("");
  }, []);

  const handleSelectAll = useCallback(() => {
    setIsNew(false);
    setActiveCat("all");
  }, []);

  const handleSelectNewArrivals = useCallback(() => {
    void trackEvent({ event_type: "category_click", module: "categories", category_id: "system:new_arrivals" });
    setActiveCat("all");
    setIsNew(true);
  }, []);

  const handleToggleHot = useCallback(() => {
    setIsHot((value) => !value);
  }, []);

  const handleToggleInStock = useCallback(() => {
    setInStock((value) => !value);
  }, []);

  type RootRowItem = { kind: "all" } | { kind: "new" } | { kind: "root"; node: Category };

  const activeRootId = useMemo(() => {
    if (isNew) return null;
    if (activeCat === "all") return null;
    return findRootCategoryIdForActive(categories, activeCat);
  }, [activeCat, categories, isNew]);

  const subCategories = useMemo(() => {
    if (!activeRootId) return [];
    const root = findCategoryById(categories, activeRootId);
    return root?.children?.filter(Boolean) ?? [];
  }, [activeRootId, categories]);
  const mobileChrome = useSmartMobileChrome({
    measureKey: `${activeCat}:${isNew ? "new" : "normal"}:${subCategories.length}`,
    expandTop: 18,
    compactStart: 72,
    hideStart: 148,
    hideDelta: 18,
    revealDelta: 10,
  });
  const scrollTabKey = isNew
    ? "new"
    : activeCat === "all"
      ? "all"
      : findRootCategoryIdForActive(categories, activeCat) ?? activeCat;
  const systemAllIconValue = siteInfo.categorySystemAllIconUrl?.trim() || "📋";
  const systemNewIconValue = siteInfo.categorySystemNewIconUrl?.trim() || "🆕";

  const rootKingkongItems = useMemo((): CategoryKingkongItem[] => {
    const row: RootRowItem[] = [{ kind: "all" }, { kind: "new" }, ...categories.map((node) => ({ kind: "root" as const, node }))];
    return row.map((item) => {
      if (item.kind === "all") {
        return {
          id: "all",
          label: "全部",
          iconValue: systemAllIconValue,
          active: activeCat === "all" && !isNew,
          onClick: handleSelectAll,
        };
      }
      if (item.kind === "new") {
        return {
          id: "new",
          label: NEW_ARRIVAL_CATEGORY_LABEL,
          iconValue: systemNewIconValue,
          active: isNew,
          onClick: handleSelectNewArrivals,
        };
      }
      const { node } = item;
      return {
        id: node.id,
        label: node.name,
        iconValue: getCategoryNavIconValue(node),
        active: !isNew && isCategoryOrDescendantActive(node, activeCat),
        onClick: () => handleRootCategoryClick(node),
      };
    });
  }, [activeCat, categories, handleRootCategoryClick, handleSelectAll, handleSelectNewArrivals, isNew, systemAllIconValue, systemNewIconValue]);

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
  const activeCategory = useMemo(() => (activeCat === "all" || isNew ? null : findCategoryById(categories, activeCat)), [activeCat, categories, isNew]);
  const activeCategoryName = activeCategory?.name || "";
  const categoryDescription = activeCategory?.description?.trim() || "";
  const siteName = (siteInfo.siteName || STORE_COPY.brandName).trim();
  const pageHeading = isNew ? NEW_ARRIVAL_CATEGORY_LABEL : activeCategoryName || "分类";
  const categoryDescriptionText = categoryDescription || (isNew
    ? `查看${siteName}最近上架的商品和服务。`
    : "用关键词、分类和筛选条件快速找到合适商品。");
  const title = isNew
    ? `新品上市｜${siteName}`
    : activeCategory?.seo_title?.trim() || (activeCategoryName ? `${activeCategoryName}｜${siteName}` : `分类｜${siteName}`);
  const description = isNew
    ? `查看${siteName}新品商品，发现最近上架的商品和服务。`
    : activeCategory?.seo_description?.trim() || (activeCategoryName
    ? categoryDescription || `查看${siteName}${activeCategoryName}分类，发现更多相关商品和服务。`
    : `查看${siteName}分类，快速找到更多商品和服务。`);
  const robots = hasComplexParams ? "noindex,follow" : "index,follow";
  const canonical = isNew
    ? buildCanonical("/categories", NEW_ARRIVAL_CATEGORY_CANONICAL_SEARCH, { keepParams: ["is_new"] })
    : activeCategoryName ? buildCanonical("/categories", `cat=${activeCat}`, { keepParams: ["cat"] }) : buildCanonical("/categories");
  const showFullSkeleton = loading && products.length === 0;
  const showSoftRefreshing = listRefreshing && products.length > 0;
  const hasMoreProducts = hasMorePaginatedItems({
    loadedCount: products.length,
    total: pagination.total,
    page: pagination.page,
    totalPages: pagination.totalPages,
  });
  const activeSearchFilterCount = activeFilterCount + (submittedQuery ? 1 : 0);
  const searchHeroStatus = submittedQuery
    ? `搜索「${submittedQuery}」`
    : filterSummary
      ? `当前筛选：${filterSummary}`
      : loading && products.length === 0
        ? "正在加载商品"
        : pagination.total > 0
          ? `${pagination.total} 款可浏览`
          : "支持关键词、分类、标签与库存组合筛选";
  const categorySearchQuickActions = useMemo(
    () => [
      {
        key: "all",
        label: "全部",
        active: activeCat === "all" && !isNew,
        onClick: handleSelectAll,
      },
      {
        key: "new",
        label: NEW_ARRIVAL_CATEGORY_LABEL,
        active: isNew,
        onClick: handleSelectNewArrivals,
      },
      {
        key: "hot",
        label: "热销",
        active: isHot,
        onClick: handleToggleHot,
      },
      {
        key: "stock",
        label: "有库存",
        active: inStock,
        onClick: handleToggleInStock,
      },
    ],
    [activeCat, handleSelectAll, handleSelectNewArrivals, handleToggleHot, handleToggleInStock, inStock, isHot, isNew],
  );

  useEffect(() => {
    if (!hasMoreProducts || loading || listRefreshing) return;

    const node = loadMoreRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          void loadMoreProducts();
        }
      },
      {
        root: null,
        rootMargin: "420px 0px",
        threshold: 0,
      },
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [hasMoreProducts, listRefreshing, loadMoreProducts, loading]);

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
            <UnifiedButton key={it.t} type="button" onClick={() => it.f(!it.k)} className={cn("store-category-filter-chip rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]", it.k && "is-active")}>{it.t}</UnifiedButton>
          ))}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-[var(--theme-text)]">商品标签</p>
          {quickTags.length > 0 ? <div className="flex flex-wrap gap-2">{quickTags.map((tag) => { const active = activeTagId === tag.id; return <UnifiedButton key={tag.id} type="button" onClick={() => setActiveTagId(active ? "" : tag.id)} className={`rounded-full border px-3 py-1.5 text-xs ${active ? "ring-2 ring-[var(--theme-price)]/30" : ""}`} style={{ backgroundColor: active ? tag.bg_color || "color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))" : "var(--theme-surface)", borderColor: tag.bg_color || "var(--theme-border)", color: active ? tag.text_color || "var(--theme-price)" : "var(--theme-text)" }}>{tag.name}</UnifiedButton>; })}</div> : <p className="text-xs text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]">暂无可用标签</p>}
        </div>
      </div>
    </ProductFilterDrawer>
  );

  const mobileCategoryTabs = (
    <div className="store-category-mobile-tabs space-y-2 pb-1">
      <CategoryKingkongRow
        items={rootKingkongItems}
        scrollKey={scrollTabKey}
        loading={loading && categories.length === 0}
        variant="plain"
        className="store-category-showcase store-category-showcase--plain store-category-switcher"
      />
      {subCategories.length > 0 ? (
        <CategorySubcategoryRail
          categories={subCategories}
          activeCat={activeCat}
          onSelect={handleSelectChild}
          layoutId="category-sub-tab"
          allItem={activeRootId ? { id: activeRootId } : undefined}
        />
      ) : null}
    </div>
  );

  const mobileFilterBar = (
    <div className="store-category-mobile-filter-shell store-category-sticky-filter md:hidden">
      <div className="store-category-mobile-tools store-category-mobile-sort-bar flex items-center">
        <ProductSortBar value={sort} onChange={setSort} className="store-category-mobile-sort-list" />
        <ProductListViewToggle value={viewMode} onChange={setViewMode} className="store-category-mobile-view-toggle" />
        {filterDrawer}
      </div>
    </div>
  );

  const desktopFilterBar = (
    <div className="store-category-toolbar store-category-sticky-filter mb-3 hidden items-center gap-2 md:flex">
      <div className="min-w-0 flex-1">
        <ProductSortBar value={sort} onChange={setSort} />
      </div>
      <ProductListViewToggle value={viewMode} onChange={setViewMode} />
      {filterDrawer}
    </div>
  );

  const wideCategoryRail = (
    <div className="store-category-tablet-rail mb-4 hidden md:block lg:hidden">
      <CategoryKingkongRow
        items={rootKingkongItems}
        scrollKey={scrollTabKey}
        loading={loading && categories.length === 0}
        variant="plain"
        className="store-category-showcase store-category-showcase--plain store-category-switcher store-category-switcher--wide"
      />
      {subCategories.length > 0 ? (
        <CategorySubcategoryRail
          categories={subCategories}
          activeCat={activeCat}
          onSelect={handleSelectChild}
          layoutId="category-tablet-sub-tab"
          className="store-category-tablet-subtabs"
          allItem={activeRootId ? { id: activeRootId } : undefined}
        />
      ) : null}
    </div>
  );
  const desktopCategoryWorkbench = (
    <CategoryDesktopWorkbench
      categories={categories}
      activeCat={activeCat}
      activeCategoryName={activeCategoryName}
      pageHeading={pageHeading}
      productTotal={pagination.total || products.length}
      activeFilterCount={activeSearchFilterCount}
      loading={loading && products.length === 0}
      quickActions={categorySearchQuickActions}
      onSelectAll={handleSelectAll}
      onSelectNewArrivals={handleSelectNewArrivals}
      onSelectCategory={handleRootCategoryClick}
      onResetFilters={clearFilters}
    />
  );

  return (
    <div
      className={cn(
        "store-page-shell store-v12-page store-categories-v12-page store-listing-page store-category-page store-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]",
        clientStyle === "black_gold"
          ? "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))_0%,var(--theme-bg)_24rem,var(--theme-bg)_100%)]"
          : clientStyle === "deep_enterprise"
            ? "bg-[linear-gradient(180deg,#101B34_0%,#101B34_7rem,color-mix(in_srgb,var(--theme-primary)_5%,var(--theme-surface))_7rem,var(--theme-bg)_28rem,var(--theme-bg)_100%)]"
            : "bg-[linear-gradient(180deg,color-mix(in_srgb,var(--theme-primary)_6%,var(--theme-surface))_0%,var(--theme-bg)_24rem,color-mix(in_srgb,var(--theme-primary)_3%,var(--theme-bg))_100%)]",
        mobileChrome.mode === "expanded" && "store-category-page--chrome-expanded",
        mobileChrome.mode === "compact" && "store-category-page--chrome-compact",
        mobileChrome.mode === "hidden" && "store-category-page--chrome-hidden",
      )}
      data-category-mobile-chrome="document-flow"
      data-category-mobile-chrome-mode={mobileChrome.mode}
      data-storefront-client-style={clientStyle}
    >
      <SeoHead
        title={title}
        description={description}
        canonical={canonical}
        robots={robots}
      />
      <div
        ref={mobileChrome.chromeRef}
        className={cn(
          "store-category-mobile-chrome md:hidden",
          mobileChrome.mode === "expanded" && "is-expanded",
          mobileChrome.mode === "compact" && "is-compact",
          mobileChrome.mode === "hidden" && "is-hidden",
        )}
      >
        <CategorySearchHero
          variant="mobile"
          pageHeading={pageHeading}
          description={categoryDescriptionText}
          statusText={searchHeroStatus}
          query={query}
          placeholder={STORE_COPY.searchPlaceholder}
          quickActions={categorySearchQuickActions}
          hasActiveSearchFilters={activeSearchFilterCount > 0}
          onQueryChange={setQuery}
          onSubmit={handleTopSearchSubmit}
          onClearSearch={handleClearTopSearch}
          onResetFilters={clearFilters}
        />
      </div>
      <div
        className={cn(
          "store-category-mobile-tabs-shell md:hidden",
          mobileChrome.mode === "expanded" && "is-expanded",
          mobileChrome.mode === "compact" && "is-compact",
          mobileChrome.mode === "hidden" && "is-hidden",
        )}
      >
        {mobileCategoryTabs}
      </div>
      {mobileFilterBar}

      <main className="store-category-main mx-auto max-w-screen-xl">
        <div className="px-[var(--store-page-x)] pb-6 pt-[var(--store-page-y)] md:px-6">
          <div className="store-category-v12-shell">
            {desktopCategoryWorkbench}
            <section className="store-category-content min-w-0">
              <div className="mb-4 hidden md:block">
                <CategorySearchHero
                  variant="desktop"
                  pageHeading={pageHeading}
                  description={categoryDescriptionText}
                  statusText={searchHeroStatus}
                  query={query}
                  placeholder={STORE_COPY.searchPlaceholder}
                  quickActions={categorySearchQuickActions}
                  hasActiveSearchFilters={activeSearchFilterCount > 0}
                  onQueryChange={setQuery}
                  onSubmit={handleTopSearchSubmit}
                  onClearSearch={handleClearTopSearch}
                  onResetFilters={clearFilters}
                />
              </div>

              {wideCategoryRail}

              {desktopFilterBar}

              <div
                className={cn(
                  "store-filter-summary mb-3 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] px-3 py-2 text-xs text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]",
                  "min-h-[2.25rem]",
                  !filterSummary && "hidden md:block md:invisible",
                )}
                aria-hidden={!filterSummary}
              >
                当前筛选：{filterSummary || "无筛选"}
              </div>

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
                shellClassName="md:min-h-[28rem]"
                displayMode={isListView ? "list" : "theme"}
                skeletonCount={8}
                siteContext={productCardSiteContext}
                showFullSkeleton={showFullSkeleton}
                showSoftRefreshing={showSoftRefreshing}
                emptyState={
                  !error ? (
                    <ClientEmptyState
                      className={cn(emptyColSpan, "store-listing-empty")}
                      title={
                        activeFilterCount > 0 || submittedQuery
                          ? "当前筛选条件无结果"
                          : activeCat !== "all"
                            ? "当前分类暂无商品"
                            : "暂无商品上架"
                      }
                      description={(activeFilterCount > 0 || submittedQuery) ? "可以清空筛选后重新浏览全部商品。" : "商品上架后会自动显示在这里。"}
                      action={
                        (activeFilterCount > 0 || submittedQuery) ? (
                          <ClientButton type="button" variant="secondary" size="sm" onClick={clearFilters}>
                            清空筛选
                          </ClientButton>
                        ) : null
                      }
                    />
                  ) : null
                }
              />
              {products.length > 0 ? (
                <div ref={loadMoreRef} className="py-8 text-center text-xs text-[var(--theme-text-muted)]" aria-live="polite">
                  {listRefreshing && hasMoreProducts ? (
                    "正在加载更多..."
                  ) : hasMoreProducts ? (
                    <UnifiedButton
                      type="button"
                      onClick={() => void loadMoreProducts()}
                      className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs font-semibold text-[var(--theme-text-muted)]"
                    >
                      继续滑动加载更多
                    </UnifiedButton>
                  ) : pagination.total > 0 ? (
                    `已加载全部 ${products.length}/${pagination.total} 款`
                  ) : null}
                  {error && products.length > 0 && hasMoreProducts ? (
                    <div className="mt-3">
                      <UnifiedButton
                        type="button"
                        onClick={() => void loadMoreProducts()}
                        className="rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-2 text-xs font-semibold text-[var(--theme-text)]"
                      >
                        加载失败，点击重试
                      </UnifiedButton>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function CategoryDesktopWorkbench({
  categories,
  activeCat,
  activeCategoryName,
  pageHeading,
  productTotal,
  activeFilterCount,
  loading,
  quickActions,
  onSelectAll,
  onSelectNewArrivals,
  onSelectCategory,
  onResetFilters,
}: {
  categories: Category[];
  activeCat: string;
  activeCategoryName: string;
  pageHeading: string;
  productTotal: number;
  activeFilterCount: number;
  loading: boolean;
  quickActions: CategorySearchQuickAction[];
  onSelectAll: () => void;
  onSelectNewArrivals: () => void;
  onSelectCategory: (category: Category) => void;
  onResetFilters: () => void;
}) {
  const visibleCategories = categories.slice(0, 10);
  const hasMoreCategories = categories.length > visibleCategories.length;

  return (
    <aside className="store-category-v12-sidebar hidden lg:block" aria-label="分类">
      <div className="store-category-v12-sidebar__inner">
        <div className="store-category-v12-sidebar__head">
          <span>
            <LayoutGrid size={16} aria-hidden />
            分类
          </span>
          <h2>{pageHeading}</h2>
          <p>选择分类和筛选后查看对应商品。</p>
        </div>

        <div className="store-category-v12-sidebar__stats">
          <div>
            <b>{loading ? "..." : Math.max(0, productTotal)}</b>
            <span>商品结果</span>
          </div>
          <div>
            <b>{Math.max(0, activeFilterCount)}</b>
            <span>当前筛选</span>
          </div>
        </div>

        <div className="store-category-v12-sidebar__section">
          <div className="store-category-v12-sidebar__section-title">
            <SlidersHorizontal size={15} aria-hidden />
            快速筛选
          </div>
          <div className="store-category-v12-sidebar__chips">
            {quickActions.map((action) => (
              <UnifiedButton
                key={action.key}
                type="button"
                aria-pressed={action.active}
                onClick={action.onClick}
                className={cn("store-category-v12-sidebar__chip", action.active && "is-active")}
              >
                {action.label}
              </UnifiedButton>
            ))}
            {activeFilterCount > 0 ? (
              <UnifiedButton
                type="button"
                className="store-category-v12-sidebar__chip store-category-v12-sidebar__chip--clear"
                onClick={onResetFilters}
              >
                清空筛选
              </UnifiedButton>
            ) : null}
          </div>
        </div>

        <div className="store-category-v12-sidebar__section">
          <div className="store-category-v12-sidebar__section-title">
            <LayoutGrid size={15} aria-hidden />
            主分类
          </div>
          <div className="store-category-v12-sidebar__list">
            <UnifiedButton
              type="button"
              aria-pressed={activeCat === "all" && !activeCategoryName}
              className={cn("store-category-v12-sidebar__row", activeCat === "all" && !activeCategoryName && "is-active")}
              onClick={onSelectAll}
            >
              <span>全部商品</span>
              <b>All</b>
            </UnifiedButton>
            <UnifiedButton
              type="button"
              className="store-category-v12-sidebar__row"
              onClick={onSelectNewArrivals}
            >
              <span>新品上市</span>
              <b>New</b>
            </UnifiedButton>
            {visibleCategories.map((category) => (
              <UnifiedButton
                key={category.id}
                type="button"
                aria-pressed={activeCat === category.id}
                className={cn("store-category-v12-sidebar__row", activeCat === category.id && "is-active")}
                onClick={() => onSelectCategory(category)}
              >
                <span>{category.name}</span>
                <b>{category.children?.length ? `${category.children.length} 子类` : "分类"}</b>
              </UnifiedButton>
            ))}
            {hasMoreCategories ? (
              <p className="store-category-v12-sidebar__more">还有 {categories.length - visibleCategories.length} 个分类，可在上方横向分类栏继续查看。</p>
            ) : null}
          </div>
        </div>

        <div className="store-category-v12-sidebar__guard">
          <ShieldCheck size={17} aria-hidden />
          <p>活动价、库存和优惠会在结算页确认。</p>
        </div>
      </div>
    </aside>
  );
}

type CategorySearchQuickAction = {
  key: string;
  label: string;
  active: boolean;
  onClick: () => void;
};

function CategorySearchHero({
  variant,
  pageHeading,
  description,
  statusText,
  query,
  placeholder,
  quickActions,
  hasActiveSearchFilters,
  onQueryChange,
  onSubmit,
  onClearSearch,
  onResetFilters,
}: {
  variant: "mobile" | "desktop";
  pageHeading: string;
  description: string;
  statusText: string;
  query: string;
  placeholder: string;
  quickActions: CategorySearchQuickAction[];
  hasActiveSearchFilters: boolean;
  onQueryChange: (value: string) => void;
  onSubmit: (value?: string) => void;
  onClearSearch: () => void;
  onResetFilters: () => void;
}) {
  const inputId = `category-search-${variant}`;
  const suggestionsId = `${inputId}-suggestions`;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const visibleSuggestions = quickActions.filter((action) => action.key !== "all").slice(0, 4);
  const trimmedQuery = query.trim();
  const showSuggestions = suggestionsOpen && (visibleSuggestions.length > 0 || trimmedQuery);

  const submitCurrentQuery = () => {
    const value = inputRef.current?.value ?? query;
    onSubmit(value);
    setSuggestionsOpen(false);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitCurrentQuery();
  };

  return (
    <section className="store-category-search-hero" data-category-search-hero={variant} aria-label="分类搜索">
      <div className="store-category-search-hero__intro">
        <p className="store-category-search-hero__eyebrow">分类</p>
        <h1 className="store-category-search-hero__title">{pageHeading}</h1>
        <p className="store-category-search-hero__description">{description}</p>
      </div>

      <div className="store-category-search-hero__panel">
        <form
          className={cn("store-category-search-dock", suggestionsOpen && "is-focused", trimmedQuery && "has-query")}
          onSubmit={handleSubmit}
          aria-label="分类页搜索"
        >
          <div className="store-category-search-input-shell">
            <Search size={18} className="store-category-search-icon" aria-hidden />
            <label className="sr-only" htmlFor={inputId}>搜索分类商品</label>
            <input
              id={inputId}
              ref={inputRef}
              name="categoryKeyword"
              type="search"
              value={query}
              aria-expanded={showSuggestions}
              aria-controls={showSuggestions ? suggestionsId : undefined}
              onClick={() => setSuggestionsOpen(true)}
              onFocus={() => setSuggestionsOpen(true)}
              onBlur={() => {
                setTimeout(() => setSuggestionsOpen(false), 120);
              }}
              onChange={(event) => {
                onQueryChange(event.target.value);
                setSuggestionsOpen(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  submitCurrentQuery();
                }
              }}
              placeholder={placeholder}
              className="store-category-search-input"
            />
            {query ? (
              <UnifiedButton
                type="button"
                className="store-category-search-clear"
                onClick={onClearSearch}
                aria-label="清空搜索关键词"
              >
                <X size={14} aria-hidden />
              </UnifiedButton>
            ) : null}
          </div>
          <UnifiedButton type="button" className="store-category-search-submit" onClick={submitCurrentQuery}>
            <Search size={15} aria-hidden />
            <span>搜索</span>
          </UnifiedButton>
        </form>

        {showSuggestions ? (
          <div
            id={suggestionsId}
            className="store-category-search-suggestions"
            role="listbox"
            aria-label="搜索建议"
            onMouseDown={(event) => event.preventDefault()}
          >
            {trimmedQuery ? (
              <UnifiedButton
                type="button"
                className="store-category-search-suggestion-primary"
                onClick={submitCurrentQuery}
                role="option"
              >
                <Search size={14} aria-hidden />
                搜索「{trimmedQuery}」
              </UnifiedButton>
            ) : null}
            {visibleSuggestions.length > 0 ? (
              <div className="store-category-search-suggestion-group">
                <span className="store-category-search-suggestion-label">热门入口</span>
                <div className="store-category-search-suggestion-list">
                  {visibleSuggestions.map((action) => (
                    <UnifiedButton
                      key={action.key}
                      type="button"
                      className={cn("store-category-search-suggestion-chip", action.active && "is-active")}
                      aria-pressed={action.active}
                      onClick={() => {
                        action.onClick();
                        setSuggestionsOpen(false);
                      }}
                      role="option"
                    >
                      {action.label}
                    </UnifiedButton>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        {variant === "desktop" ? (
          <div className="store-category-search-meta">
            <div className="store-category-search-actions" role="group" aria-label="快速筛选">
              {quickActions.map((action) => (
                <UnifiedButton
                  key={action.key}
                  type="button"
                  aria-pressed={action.active}
                  onClick={action.onClick}
                  className={cn("store-category-search-chip", action.active && "is-active")}
                >
                  {action.label}
                </UnifiedButton>
              ))}
              {hasActiveSearchFilters ? (
                <UnifiedButton
                  type="button"
                  className="store-category-search-chip store-category-search-chip--clear"
                  onClick={onResetFilters}
                >
                  <X size={13} aria-hidden />
                  清空
                </UnifiedButton>
              ) : null}
            </div>
            <p className="store-category-search-status">{statusText}</p>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function normalizeSort(value: string | null): ProductSortType {
  if (value === "sales" || value === "newest" || value === "price-asc" || value === "price-desc") return value;
  return "default";
}

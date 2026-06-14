import { useState, useEffect, useCallback, useMemo, useRef, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { useProductStore } from "@/stores/useProductStore";
import StoreTabHeader from "@/components/store/StoreTabHeader";
import { STORE_COPY } from "@/constants/storeCopy";
import { motion } from "framer-motion";
import { useMotionConfig } from "@/modules/micro-interactions";
import { cn } from "@/lib/utils";
import ProductFilterDrawer from "@/components/ProductFilterDrawer";
import ProductSortBar from "@/components/ProductSortBar";
import CategoryKingkongRow, { type CategoryKingkongItem } from "@/components/CategoryKingkongRow";
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

  const handleTopSearchSubmit = useCallback(() => {
    setSubmittedQuery(query.trim());
  }, [query]);

  const handleSelectAll = useCallback(() => {
    setIsNew(false);
    setActiveCat("all");
  }, []);

  const handleSelectNewArrivals = useCallback(() => {
    void trackEvent({ event_type: "category_click", module: "categories", category_id: "system:new_arrivals" });
    setActiveCat("all");
    setIsNew(true);
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
  const pageHeading = isNew ? NEW_ARRIVAL_CATEGORY_LABEL : activeCategoryName || "全部分类";
  const title = isNew
    ? `新品上市｜${siteName}`
    : activeCategory?.seo_title?.trim() || (activeCategoryName ? `${activeCategoryName}｜${siteName}` : `全部分类｜${siteName}`);
  const description = isNew
    ? `查看${siteName}新品商品，发现最近上架的商品和服务。`
    : activeCategory?.seo_description?.trim() || (activeCategoryName
    ? categoryDescription || `查看${siteName}${activeCategoryName}分类，发现更多相关商品和服务。`
    : `查看${siteName}全部分类，快速找到更多商品和服务。`);
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
          {quickTags.length > 0 ? <div className="flex flex-wrap gap-2">{quickTags.map((tag) => { const active = activeTagId === tag.id; return <UnifiedButton key={tag.id} type="button" onClick={() => setActiveTagId(active ? "" : tag.id)} className={`rounded-full border px-3 py-1.5 text-xs ${active ? "ring-2 ring-[var(--theme-price)]/30" : ""}`} style={{ backgroundColor: active ? tag.bg_color || "color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))" : "var(--theme-surface)", borderColor: tag.bg_color || "var(--theme-border)", color: active ? tag.text_color || "var(--theme-price)" : "var(--theme-text)" }}>{tag.name}</UnifiedButton>; })}</div> : <p className="text-xs text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]">暂无可用标签，请先在后台给商品绑定标签</p>}
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
        <div className="store-category-subtabs no-scrollbar flex flex-wrap gap-1.5">
          {subCategories.map((child) => (
            <CategoryTabButton
              key={child.id}
              active={activeCat === child.id}
              onClick={() => handleSelectChild(child.id)}
              layoutId="category-sub-tab"
              activeClassName="store-category-subtab-active-bg"
              activeTextClass="store-category-subtab-active-label"
              className="store-category-subtab px-3"
            >
              {child.name}
            </CategoryTabButton>
          ))}
        </div>
      ) : null}
    </div>
  );

  const mobileFilterBar = (
    <div className="store-category-mobile-filter-shell store-category-sticky-filter md:hidden">
      <div className="store-category-mobile-tools flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <ProductSortBar value={sort} onChange={setSort} />
        </div>
        <ProductListViewToggle value={viewMode} onChange={setViewMode} />
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
    <div className="store-category-tablet-rail mb-4 hidden md:block">
      <CategoryKingkongRow
        items={rootKingkongItems}
        scrollKey={scrollTabKey}
        loading={loading && categories.length === 0}
        variant="plain"
        className="store-category-showcase store-category-showcase--plain store-category-switcher store-category-switcher--wide"
      />
      {subCategories.length > 0 ? (
        <div className="store-category-tablet-subtabs store-category-subtabs flex flex-wrap gap-1.5">
          {subCategories.map((child) => (
            <CategoryTabButton
              key={child.id}
              active={activeCat === child.id}
              onClick={() => handleSelectChild(child.id)}
              layoutId="category-tablet-sub-tab"
              activeClassName="store-category-subtab-active-bg"
              activeTextClass="store-category-subtab-active-label"
              className="store-category-subtab px-3"
            >
              {child.name}
            </CategoryTabButton>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={cn(
        "store-page-shell store-listing-page store-category-page store-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]",
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
        <StoreTabHeader
          searchMode="filter"
          searchValue={query}
          onSearchChange={setQuery}
          onSearchSubmit={handleTopSearchSubmit}
          searchPlaceholder={STORE_COPY.searchPlaceholder}
          showSiteNameMobile
          position="static"
          className="store-home-topbar store-category-mobile-header store-category-topbar"
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
          <div>
            <section className="store-category-content min-w-0">
              <div className="store-category-desktop-title mb-4 hidden rounded-[1.125rem] border border-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-border))] bg-[color-mix(in_srgb,var(--theme-surface)_92%,var(--theme-bg))] px-5 py-4 shadow-[0_12px_36px_color-mix(in_srgb,var(--theme-primary)_8%,transparent)] md:block">
                <div className="mb-2 h-1 w-8 rounded-full bg-[var(--theme-primary)]" aria-hidden />
                <p className="text-xs font-black uppercase tracking-[0.2em] text-[var(--theme-primary)]">分类目录</p>
                <h1 className="mt-1 text-2xl font-black tracking-normal text-[var(--theme-text)]">{pageHeading}</h1>
                {categoryDescription ? (
                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-[var(--theme-text-muted)]">{categoryDescription}</p>
                ) : null}
              </div>

              {wideCategoryRail}

              {desktopFilterBar}

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
    <UnifiedButton
      ref={btnRef}
      type="button"
      aria-pressed={active}
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "relative flex-shrink-0 overflow-hidden rounded-full px-4 py-1.5 text-xs font-medium",
        active ? "border border-transparent" : "border border-[var(--theme-border)] bg-[var(--theme-surface)]",
        active && "is-active",
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
    </UnifiedButton>
  );
}

function normalizeSort(value: string | null): ProductSortType {
  if (value === "sales" || value === "newest" || value === "price-asc" || value === "price-desc") return value;
  return "default";
}

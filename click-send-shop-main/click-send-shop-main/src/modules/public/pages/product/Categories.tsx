import { useState, useEffect, useCallback, useMemo, useRef, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, X } from "lucide-react";
import { useProductStore } from "@/stores/useProductStore";
import { STORE_COPY } from "@/constants/storeCopy";
import { cn } from "@/lib/utils";
import ProductFilterDrawer from "@/components/ProductFilterDrawer";
import ProductSortBar from "@/components/ProductSortBar";
import type { CategoryKingkongItem } from "@/components/CategoryKingkongRow";
import CategoryNavTile from "@/components/store/CategoryNavTile";
import { getCategoryNavIconValue } from "@/utils/categoryNavIcon";
import * as productService from "@/services/productService";
import type { ProductListParams, ProductSortType, ProductTag } from "@/types/product";
import type { Category } from "@/types/category";
import { findCategoryById, findRootCategoryIdForActive, isCategoryOrDescendantActive } from "@/utils/categoryTree";
import { trackEvent } from "@/services/analyticsService";
import { toast } from "sonner";
import { useClientDesignStyle } from "@/modules/storefront-v2/design/useClientDesignStyle";
import { THEME_ALERT_ERROR_SOFT } from "@/utils/themeVisuals";
import { THEME_PREVIEW_PARAM_NAMES } from "@/utils/themePreviewParams";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import StorefrontLoadErrorPanel from "@/components/store/StorefrontLoadErrorPanel";
import SilkProductGrid from "@/components/motion/SilkProductGrid";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { hasMorePaginatedItems } from "@/lib/pagination";
import {
  NEW_ARRIVAL_CATEGORY_CANONICAL_SEARCH,
  NEW_ARRIVAL_CATEGORY_LABEL,
  isNewArrivalCategoryParams,
} from "@/constants/newArrivalNavigation";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";

export default function Categories() {
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
  const [searchParams, setSearchParams] = useSearchParams();
  const syncedSearchKeyRef = useRef(searchParams.toString());
  const syncingFromUrlRef = useRef(false);
  const productGridClass = "sf-next-product-grid store-product-grid grid grid-cols-2 gap-x-5 gap-y-8 pt-1 md:grid-cols-3 xl:grid-cols-4";
  const emptyColSpan = "col-span-2 md:col-span-3 xl:col-span-4";

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
  const [readyProductQueryKey, setReadyProductQueryKey] = useState("");
  const latestProductQueryKeyRef = useRef("");
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

  const productListParams = useMemo<ProductListParams | null>(() => {
    const min = minPrice ? Number(minPrice) : undefined;
    const max = maxPrice ? Number(maxPrice) : undefined;
    if (min !== undefined && max !== undefined && min > max) return null;
    return {
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
    };
  }, [activeCat, activeTagId, inStock, isHot, isNew, isRecommended, maxPrice, minPrice, siteInfo.newArrivalOnlyInStock, sort, submittedQuery]);

  const productQueryKey = useMemo(() => {
    if (!productListParams) return "invalid-price-range";
    return JSON.stringify(
      Object.entries(productListParams)
        .filter(([, value]) => value !== undefined && value !== null && value !== "")
        .sort(([a], [b]) => a.localeCompare(b)),
    );
  }, [productListParams]);

  useEffect(() => {
    if (!productListParams) return;

    let cancelled = false;
    const queryKey = productQueryKey;
    latestProductQueryKeyRef.current = queryKey;
    setReadyProductQueryKey("");

    void loadProducts(productListParams).finally(() => {
      if (!cancelled && latestProductQueryKeyRef.current === queryKey) {
        setReadyProductQueryKey(queryKey);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loadProducts, productListParams, productQueryKey]);

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
    setActiveTagId("");
    setSort("default");
    setQuery("");
    setSubmittedQuery("");
    setMinPrice("");
    setMaxPrice("");
    setInStock(false);
    setIsNew(false);
    setIsHot(false);
    setIsRecommended(false);
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
  const systemAllIconValue = siteInfo.categorySystemAllIconUrl?.trim() || "all";
  const systemNewIconValue = siteInfo.categorySystemNewIconUrl?.trim() || "new";

  const rootKingkongItems = useMemo((): CategoryKingkongItem[] => {
    const row: Array<{ kind: "all" } | { kind: "new" } | { kind: "root"; node: Category }> = [
      { kind: "all" },
      { kind: "new" },
      ...categories.map((node) => ({ kind: "root" as const, node })),
    ];
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
        label: storefrontCategoryName(node.name),
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
  const activeCategoryName = activeCategory ? storefrontCategoryName(activeCategory.name) : "";
  const categoryDescription = activeCategory?.description?.trim() || "";
  const siteName = (siteInfo.siteName || STORE_COPY.brandName).trim();
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
  const productQueryReady = readyProductQueryKey === productQueryKey;
  const visibleProducts = productQueryReady ? products : [];
  const showFullSkeleton = Boolean(productListParams) && (!productQueryReady || (loading && visibleProducts.length === 0));
  const showSoftRefreshing = productQueryReady && listRefreshing && visibleProducts.length > 0;
  const hasMoreProducts = hasMorePaginatedItems({
    loadedCount: visibleProducts.length,
    total: pagination.total,
    page: pagination.page,
    totalPages: pagination.totalPages,
  });

  const categoryPills = useMemo(() => {
    const base = rootKingkongItems.slice(0, 6);
    const active = rootKingkongItems.find((item) => item.active && !base.some((baseItem) => baseItem.id === item.id));
    return active ? [...base.slice(0, 5), active] : base;
  }, [rootKingkongItems]);
  const featuredCategoryItems = useMemo(() => {
    const preferred = rootKingkongItems.filter((item) => item.id !== "all" && item.id !== "new");
    return (preferred.length ? preferred : rootKingkongItems).slice(0, 4);
  }, [rootKingkongItems]);
  const activeFilterLabels = useMemo(() => {
    const labels: Array<{ key: string; label: string; onRemove?: () => void }> = [];
    if (submittedQuery) labels.push({ key: "query", label: submittedQuery, onRemove: handleClearTopSearch });
    if (isNew) labels.push({ key: "new", label: NEW_ARRIVAL_CATEGORY_LABEL, onRemove: () => setIsNew(false) });
    if (isHot) labels.push({ key: "hot", label: "热销", onRemove: () => setIsHot(false) });
    if (isRecommended) labels.push({ key: "recommended", label: "推荐", onRemove: () => setIsRecommended(false) });
    if (inStock) labels.push({ key: "stock", label: "有库存", onRemove: () => setInStock(false) });
    if (minPrice || maxPrice) {
      labels.push({
        key: "price",
        label: `${minPrice || "0"}-${maxPrice || "不限"}`,
        onRemove: () => {
          setMinPrice("");
          setMaxPrice("");
        },
      });
    }
    return labels;
  }, [handleClearTopSearch, inStock, isHot, isNew, isRecommended, maxPrice, minPrice, submittedQuery]);

  useEffect(() => {
    if (!productQueryReady || !hasMoreProducts || loading || listRefreshing) return;

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
  }, [hasMoreProducts, listRefreshing, loadMoreProducts, loading, productQueryReady]);

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
          {[
            { k: inStock, t: "只看有库存", f: setInStock },
            { k: isNew, t: "新品", f: setIsNew },
            { k: isHot, t: "热销", f: setIsHot },
            { k: isRecommended, t: "推荐", f: setIsRecommended },
          ].map((it) => (
            <UnifiedButton key={it.t} type="button" onClick={() => it.f(!it.k)} className={cn("store-category-filter-chip rounded-xl border px-3 py-2 text-xs font-semibold transition active:scale-[0.98]", it.k && "is-active")}>{it.t}</UnifiedButton>
          ))}
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold text-[var(--theme-text)]">商品标签</p>
          {quickTags.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {quickTags.map((tag) => {
                const active = activeTagId === tag.id;
                return (
                  <UnifiedButton
                    key={tag.id}
                    type="button"
                    onClick={() => setActiveTagId(active ? "" : tag.id)}
                    className={`rounded-full border px-3 py-1.5 text-xs ${active ? "ring-2 ring-[var(--theme-price)]/30" : ""}`}
                    style={{
                      backgroundColor: active ? tag.bg_color || "color-mix(in_srgb,var(--theme-price)_14%,var(--theme-surface))" : "var(--theme-surface)",
                      borderColor: tag.bg_color || "var(--theme-border)",
                      color: active ? tag.text_color || "var(--theme-price)" : "var(--theme-text)",
                    }}
                  >
                    {storefrontCategoryName(tag.name)}
                  </UnifiedButton>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]">暂无可用标签</p>
          )}
        </div>
      </div>
    </ProductFilterDrawer>
  );
  const productSectionTitle = isNew ? NEW_ARRIVAL_CATEGORY_LABEL : activeCategoryName || "全部商品";

  return (
    <div
      className="store-page-shell store-v12-page store-categories-v12-page store-listing-page store-category-page sf-next-category-page store-bottom-safe text-[var(--theme-text)]"
      data-storefront-client-style={clientStyle}
    >
      <SeoHead
        title={title}
        description={description}
        canonical={canonical}
        robots={robots}
      />
      <main className="store-category-main sf-next-category-shell mx-auto w-full max-w-screen-xl">
        <section className="sf-next-category-hero" aria-label="分类入口">
          <div className="sf-next-category-titlebar">
            <h1>分类</h1>
            <UnifiedButton type="button" className="sf-next-icon-button" onClick={() => handleTopSearchSubmit()} aria-label="搜索分类商品">
              <Search size={24} aria-hidden />
            </UnifiedButton>
          </div>
          <CategorySearchForm
            query={query}
            placeholder={STORE_COPY.searchPlaceholder}
            onQueryChange={setQuery}
            onSubmit={handleTopSearchSubmit}
            onClearSearch={handleClearTopSearch}
          />
          <CategoryTextPills items={categoryPills} loading={loading && categories.length === 0} />
        </section>

        <FeaturedCategoryGrid
          items={featuredCategoryItems}
          loading={loading && categories.length === 0}
        />

        {subCategories.length > 0 ? (
          <section className="sf-next-subcategory-strip" aria-label="子分类">
            <UnifiedButton
              type="button"
              aria-pressed={activeRootId === activeCat}
              className={cn("sf-next-subcategory-chip", activeRootId === activeCat && "is-active")}
              onClick={() => activeRootId && handleSelectChild(activeRootId)}
            >
              全部
            </UnifiedButton>
            {subCategories.map((child) => (
              <UnifiedButton
                key={child.id}
                type="button"
                aria-pressed={activeCat === child.id}
                className={cn("sf-next-subcategory-chip", activeCat === child.id && "is-active")}
                onClick={() => handleSelectChild(child.id)}
              >
                {storefrontCategoryName(child.name)}
              </UnifiedButton>
            ))}
          </section>
        ) : null}

        <section className="sf-next-listing-section" aria-label={productSectionTitle}>
          <div className="sf-next-listing-head">
            <h2>{productSectionTitle}</h2>
            <div className="sf-next-listing-head-actions">
              {filterDrawer}
            </div>
          </div>
          <div className="sf-next-listing-sort-shell">
            <ProductSortBar value={sort} onChange={setSort} className="sf-next-listing-sortbar" />
          </div>
          <ActiveFilterStrip labels={activeFilterLabels} onClear={clearFilters} />

          {error && visibleProducts.length === 0 ? (
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
          {error && visibleProducts.length > 0 ? (
            <p className={`mb-3 px-3 py-2 text-center text-xs ${THEME_ALERT_ERROR_SOFT}`}>
              商品列表暂时无法刷新，以下为缓存数据
            </p>
          ) : null}

          <SilkProductGrid
            products={visibleProducts}
            className={productGridClass}
            shellClassName="md:min-h-[28rem]"
            displayMode="theme"
            skeletonCount={8}
            siteContext={productCardSiteContext}
            itemKeyPrefix={`category:${isNew ? "new" : activeCat}`}
            showFullSkeleton={showFullSkeleton}
            showSoftRefreshing={showSoftRefreshing}
            emptyState={
              !error ? (
                <section className={cn(emptyColSpan, "store-account-v12-empty-panel store-listing-empty")}>
                  <span className="store-account-v12-empty-panel__icon" aria-hidden>
                    <Search size={28} />
                  </span>
                  <h2>
                    {activeFilterCount > 0 || submittedQuery
                      ? "当前筛选条件无结果"
                      : activeCat !== "all"
                        ? "当前分类暂无商品"
                        : "暂无商品上架"}
                  </h2>
                  <p>
                    {(activeFilterCount > 0 || submittedQuery)
                      ? "可以清空筛选后重新浏览全部商品。"
                      : "商品上架后会自动显示在这里。"}
                  </p>
                  {(activeFilterCount > 0 || submittedQuery) ? (
                    <UnifiedButton type="button" onClick={clearFilters} className="store-account-v12-empty-panel__action">
                      <X size={17} aria-hidden />
                      清空筛选
                    </UnifiedButton>
                  ) : null}
                </section>
              ) : null
            }
          />
          {visibleProducts.length > 0 ? (
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
                `已加载全部 ${visibleProducts.length}/${pagination.total} 款`
              ) : null}
              {error && visibleProducts.length > 0 && hasMoreProducts ? (
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
      </main>
    </div>
  );
}

function CategorySearchForm({
  query,
  placeholder,
  onQueryChange,
  onSubmit,
  onClearSearch,
}: {
  query: string;
  placeholder: string;
  onQueryChange: (value: string) => void;
  onSubmit: (value?: string) => void;
  onClearSearch: () => void;
}) {
  const inputId = "category-search-next";
  const inputRef = useRef<HTMLInputElement | null>(null);

  const submitCurrentQuery = () => {
    const value = inputRef.current?.value ?? query;
    onSubmit(value);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    submitCurrentQuery();
  };

  return (
    <form className="sf-next-category-search" onSubmit={handleSubmit} aria-label="分类页搜索">
      <Search size={21} className="sf-next-category-search__icon" aria-hidden />
      <label className="sr-only" htmlFor={inputId}>搜索分类商品</label>
      <input
        id={inputId}
        ref={inputRef}
        name="categoryKeyword"
        type="search"
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            submitCurrentQuery();
          }
        }}
        placeholder={placeholder}
      />
      {query ? (
        <UnifiedButton
          type="button"
          className="sf-next-category-search__clear"
          onClick={onClearSearch}
          aria-label="清空搜索关键词"
        >
          <X size={15} aria-hidden />
        </UnifiedButton>
      ) : null}
    </form>
  );
}

function CategoryTextPills({ items, loading }: { items: CategoryKingkongItem[]; loading: boolean }) {
  return (
    <div className="sf-next-category-pills" role="tablist" aria-label="商品分类">
      {loading
        ? Array.from({ length: 5 }).map((_, index) => (
            <span key={index} className="sf-next-category-pill is-loading" aria-hidden />
          ))
        : items.map((item) => (
            <UnifiedButton
              key={item.id}
              type="button"
              aria-pressed={item.active}
              className={cn("sf-next-category-pill", item.active && "is-active")}
              onClick={item.onClick}
            >
              {item.label}
            </UnifiedButton>
          ))}
    </div>
  );
}

function FeaturedCategoryGrid({ items, loading }: { items: CategoryKingkongItem[]; loading: boolean }) {
  return (
    <section className="sf-next-featured-categories" aria-labelledby="sf-next-featured-categories-title">
      <h2 id="sf-next-featured-categories-title">精选分类</h2>
      <div className="sf-next-featured-categories__grid">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="sf-next-featured-category is-loading" aria-hidden>
                <span />
                <i />
              </div>
            ))
          : items.map((item) => (
              <CategoryNavTile
                key={item.id}
                id={item.id}
                label={item.label}
                iconValue={item.iconValue}
                active={item.active}
                onClick={item.onClick}
                variant="plain"
                className="sf-next-featured-category"
              />
            ))}
      </div>
    </section>
  );
}

function ActiveFilterStrip({
  labels,
  onClear,
}: {
  labels: Array<{ key: string; label: string; onRemove?: () => void }>;
  onClear: () => void;
}) {
  if (!labels.length) return null;
  return (
    <div className="sf-next-active-filters" aria-label="已选筛选">
      <span>已选：</span>
      {labels.map((item) => (
        <UnifiedButton key={item.key} type="button" className="sf-next-active-filter" onClick={item.onRemove}>
          {item.label}
          {item.onRemove ? <X size={13} aria-hidden /> : null}
        </UnifiedButton>
      ))}
      <UnifiedButton type="button" className="sf-next-active-filter sf-next-active-filter--clear" onClick={onClear}>
        清空
      </UnifiedButton>
    </div>
  );
}

function normalizeSort(value: string | null): ProductSortType {
  if (value === "sales" || value === "newest" || value === "price-asc" || value === "price-desc") return value;
  return "default";
}

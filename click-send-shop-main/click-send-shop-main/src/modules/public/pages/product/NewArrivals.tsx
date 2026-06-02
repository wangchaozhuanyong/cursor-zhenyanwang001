import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import StorePageHeader from "@/components/store/StorePageHeader";
import ProductSortBar from "@/components/ProductSortBar";
import ProductListViewToggle from "@/components/ProductListViewToggle";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useCategoryListView } from "@/hooks/useCategoryListView";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useProductStore } from "@/stores/useProductStore";
import type { ProductSortType } from "@/types/product";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getCategoryProductsGridClass } from "@/utils/productGridClasses";
import SeoHead from "@/components/SeoHead";
import { buildCanonical } from "@/utils/seo";
import { useGoBack } from "@/hooks/useGoBack";
import SilkProductGrid from "@/components/motion/SilkProductGrid";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export default function NewArrivals() {
  const { themeConfig } = useThemeRuntime();
  const { viewMode, setViewMode } = useCategoryListView();
  const productGridClass = getCategoryProductsGridClass(viewMode, themeConfig.productCardVariant);
  const isListView = viewMode === "list";
  useDocumentTitle("新品上市");
  const navigate = useNavigate();
  const goBack = useGoBack("/");
  const siteInfo = useSiteInfo();
  const siteCapabilities = useSiteCapabilities();
  const siteName = siteInfo.siteName || "官方商城";
  const { products, loading, listRefreshing, error, loadProducts } = useProductStore();
  const [sort, setSort] = useState<ProductSortType>("newest");
  const productCardSiteContext = useMemo(
    () => ({
      restrictedComplianceEnabled: siteCapabilities.restrictedProductComplianceEnabled,
      siteInfo,
    }),
    [siteCapabilities.restrictedProductComplianceEnabled, siteInfo],
  );
  const showFullSkeleton = loading && products.length === 0;
  const showSoftRefreshing = listRefreshing && products.length > 0;

  useEffect(() => {
    loadProducts({
      is_new: true,
      home_new_arrivals_rule: 1,
      new_arrivals_only_in_stock: siteInfo.newArrivalOnlyInStock !== "0" ? 1 : 0,
      sort: sort === "default" ? "newest" : sort,
      page: 1,
      pageSize: 50,
    });
  }, [loadProducts, siteInfo.newArrivalOnlyInStock, sort]);

  return (
    <div className="store-page-shell store-bottom-safe bg-[var(--theme-bg)] text-[var(--theme-text)]">
      <SeoHead
        title={`新品上市｜${siteName}`}
        description="发现最新上架的好物，最近上新的商品都在这里。"
        canonical={buildCanonical("/new-arrivals")}
        robots="index,follow"
      />
      <StorePageHeader
        title="新品上市"
        leftSlot={(
          <UnifiedButton
            type="button"
            onClick={goBack}
            aria-label="返回"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)] transition active:scale-95 touch-target"
          >
            <ArrowLeft size={20} strokeWidth={2.25} />
          </UnifiedButton>
        )}
        titleInlineSlot={(
          <div className="flex min-w-0 flex-1 items-center justify-end gap-2">
            <ProductSortBar
              value={sort}
              onChange={setSort}
              className="min-w-0 flex-1 max-w-[min(100%,16rem)]"
            />
            <ProductListViewToggle value={viewMode} onChange={setViewMode} />
          </div>
        )}
      />

      <main className="mx-auto max-w-screen-xl px-[var(--store-page-x)] pb-6 pt-[var(--store-page-y)] md:px-6">
        <p className="mt-2 text-sm text-[var(--theme-text-muted)]">发现最新上架的好物</p>
        {error ? (
          <div className="mt-2 rounded-xl border border-[var(--theme-border)] bg-[var(--theme-surface)] p-3 text-center text-sm text-[color-mix(in_srgb,var(--theme-text-on-surface)_72%,var(--theme-text-muted))]">
            {error}
          </div>
        ) : null}
        <section className="mt-4">
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
                <div className="rounded-2xl border border-dashed border-[var(--theme-border)] bg-[var(--theme-surface)] px-4 py-12 text-center">
                  <p className="text-sm font-semibold text-[var(--theme-text)]">暂无新品上市</p>
                  <p className="mt-2 text-xs text-[color-mix(in_srgb,var(--theme-text-on-surface)_70%,var(--theme-text-muted))]">
                    更多新品正在准备中，请稍后再来看看。
                  </p>
                  <UnifiedButton
                    type="button"
                    onClick={() => navigate("/categories")}
                    className="mt-5 rounded-full bg-[var(--theme-primary)] px-5 py-2 text-xs font-bold text-[var(--theme-primary-foreground)]"
                  >
                    查看全部分类
                  </UnifiedButton>
                </div>
              ) : null
            }
          />
        </section>
      </main>
    </div>
  );
}

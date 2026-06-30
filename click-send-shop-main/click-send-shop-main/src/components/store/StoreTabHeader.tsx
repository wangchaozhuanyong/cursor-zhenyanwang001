import { Bell } from "lucide-react";
import { lazy, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import StoreSearchField from "@/components/store/StoreSearchField";
import { StoreSearchDrawer, StoreSearchLauncher } from "@/components/store/StoreSearchDrawer";
import { buildStoreSearchCategoryOptions, type StoreSearchTagOption } from "@/components/store/storeSearchOptions";
import { useSiteInfo, useSiteInfoLoaded } from "@/hooks/useSiteInfo";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { STORE_COPY } from "@/constants/storeCopy";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { isLoggedIn } from "@/utils/token";
import StoreBrandLogo from "@/components/store/StoreBrandLogo";
import * as productService from "@/services/productService";
import { useProductStore } from "@/stores/useProductStore";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import { appendThemePreviewParams } from "@/utils/themePreviewParams";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";
import type { ProductTag } from "@/types/product";

const StoreNotificationAction = lazy(() => import("@/components/store/StoreNotificationAction"));

export type StoreTabHeaderSearchMode = "navigate" | "filter" | "none";

type StoreTabHeaderProps = {
  /** navigate：点击打开统一搜索抽屉；filter：页内筛选；none：无搜索（游客首页） */
  searchMode?: StoreTabHeaderSearchMode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  onSearchSubmit?: () => void;
  searchPlaceholder?: string;
  /** 覆盖右侧区域；不传则显示通知按钮 */
  rightSlot?: ReactNode;
  /** 是否在 Logo 旁显示站名（sm 及以上）；游客首页可在小屏也显示 */
  showSiteName?: boolean;
  showSiteNameMobile?: boolean;
  /** 首页顶栏统一 sticky；fixed 保留兼容旧用法；static 用于分类页原有滚动编排 */
  position?: "sticky" | "fixed" | "static";
  className?: string;
};

export default function StoreTabHeader({
  searchMode = "navigate",
  searchValue = "",
  onSearchChange,
  onSearchSubmit,
  searchPlaceholder,
  rightSlot,
  showSiteName = true,
  showSiteNameMobile = false,
  position = "sticky",
  className,
}: StoreTabHeaderProps) {
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const siteInfoLoaded = useSiteInfoLoaded();
  const { themeConfig } = useThemeRuntime();
  const [navigateSearchValue, setNavigateSearchValue] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTags, setSearchTags] = useState<ProductTag[]>([]);
  const categories = useProductStore((state) => state.categories);
  const loadCategories = useProductStore((state) => state.loadCategories);

  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const shouldReserveLogoSpace = Boolean(logoSrc) || !siteInfoLoaded;
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);

  const goSearch = () => {
    setSearchOpen(true);
  };
  const submitSearch = (value: string) => {
    const keyword = value.trim();
    navigateWithStoreTransition(navigate, appendThemePreviewParams(keyword ? `/search?keyword=${encodeURIComponent(keyword)}` : "/search"));
  };
  const goNotifications = () => navigateWithStoreTransition(navigate, "/notifications");

  useEffect(() => {
    if (searchMode !== "navigate") return;
    void loadCategories();
    productService.fetchProductTags(16).then(setSearchTags).catch(() => setSearchTags([]));
  }, [loadCategories, searchMode]);

  const searchCategoryOptions = useMemo(() => buildStoreSearchCategoryOptions({
    categories,
    onAll: () => navigateWithStoreTransition(navigate, appendThemePreviewParams("/categories")),
    onNew: () => navigateWithStoreTransition(navigate, appendThemePreviewParams(NEW_ARRIVAL_CATEGORY_PATH)),
    onCategorySelect: (category) => navigateWithStoreTransition(navigate, appendThemePreviewParams(`/categories?cat=${encodeURIComponent(category.id)}`)),
  }), [categories, navigate]);

  const searchTagOptions = useMemo<StoreSearchTagOption[]>(() => searchTags.map((tag) => ({
    id: tag.id,
    label: storefrontCategoryName(tag.name),
    onSelect: () => navigateWithStoreTransition(navigate, appendThemePreviewParams(`/categories?tag_id=${encodeURIComponent(tag.id)}`)),
  })), [navigate, searchTags]);

  const nameClass = cn(
    "store-brand-name truncate tracking-normal",
    showSiteNameMobile ? "text-lg" : "hidden text-lg sm:block",
  );

  return (
    <header
      className={cn(
        position === "fixed" && "fixed left-0 right-0 top-0",
        position === "sticky" && "sticky top-0",
        position === "static" && "relative",
        "z-header border-b backdrop-blur-xl pt-[env(safe-area-inset-top,0px)] md:hidden",
        surfaceClass,
        className,
      )}
    >
      <div className="mx-auto flex h-[var(--store-tab-header-height)] w-full max-w-screen-xl items-center gap-2 px-[var(--store-header-x)]">
        <UnifiedButton
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0"
          onClick={() => navigateWithStoreTransition(navigate, "/")}
          aria-label={`${siteName} 首页`}
        >
          {shouldReserveLogoSpace ? <StoreBrandLogo src={logoSrc} siteName={siteName} fallbackText="" /> : null}
          {showSiteName ? <span className={nameClass}>{siteName}</span> : null}
        </UnifiedButton>

        {searchMode === "navigate" ? (
          <StoreSearchLauncher
            className="sf-next-tab-search-launcher"
            placeholder={searchPlaceholder ?? STORE_COPY.searchPlaceholder}
            value={navigateSearchValue}
            onClick={goSearch}
          />
        ) : null}

        {searchMode === "filter" ? (
          <StoreSearchField
            mode="filter"
            placeholder={searchPlaceholder ?? STORE_COPY.searchPlaceholder}
            value={searchValue}
            onValueChange={onSearchChange}
            onSubmit={onSearchSubmit}
            showSubmitButton
          />
        ) : null}

        {searchMode === "none" ? <div className="min-w-0 flex-1" /> : null}

        <div className="flex shrink-0 items-center gap-1.5">
          {rightSlot ?? (
            isLoggedIn() ? (
              <Suspense fallback={null}>
                <StoreNotificationAction onClick={goNotifications} />
              </Suspense>
            ) : (
              <UnifiedButton
                type="button"
                className="sf-next-notification-button relative flex h-[2.625rem] w-[2.625rem] overflow-visible items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/50"
                onClick={goNotifications}
                aria-label="消息通知"
              >
                <Bell size={16} className="relative z-[1] text-[var(--theme-text)]" />
              </UnifiedButton>
            )
          )}
        </div>
      </div>
      {searchMode === "navigate" ? (
        <StoreSearchDrawer
          open={searchOpen}
          value={navigateSearchValue}
          placeholder={searchPlaceholder ?? STORE_COPY.searchPlaceholder}
          categories={searchCategoryOptions}
          tags={searchTagOptions}
          onClose={() => setSearchOpen(false)}
          onSubmit={submitSearch}
          onValueChange={setNavigateSearchValue}
          onClear={() => setNavigateSearchValue("")}
        />
      ) : null}
    </header>
  );
}

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { ArrowLeft, Share2, ShoppingCart } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { StoreSearchDrawer, StoreSearchLauncher } from "@/components/store/StoreSearchDrawer";
import { buildStoreSearchCategoryOptions, type StoreSearchTagOption } from "@/components/store/storeSearchOptions";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { STORE_COPY } from "@/constants/storeCopy";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { appendThemePreviewParams } from "@/utils/themePreviewParams";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";
import { useProductStore } from "@/stores/useProductStore";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import * as productService from "@/services/productService";
import type { ProductTag } from "@/types/product";

export type ProductDetailStickyHeaderProps = {
  /** 吸顶实底：主图滚出顶区后为 true；沉浸透明为 false */
  solid: boolean;
  onBack: () => void;
  onShare: () => void;
  onCart: () => void;
};

function ImmersiveIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <UnifiedButton
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--overlay-color)_60%,transparent)] text-[var(--hero-foreground)] shadow-sm [text-shadow:0_1px_2px_var(--shadow-color)] backdrop-blur-md transition active:scale-95 touch-target"
    >
      {children}
    </UnifiedButton>
  );
}

function SolidIconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <UnifiedButton
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-bg)] text-[var(--theme-text)] transition active:scale-95 touch-target"
    >
      {children}
    </UnifiedButton>
  );
}

/** 商品详情固定顶栏：顶部沉浸透明，滚过主图区后吸顶实底并展示搜索 */
export default function ProductDetailStickyHeader({
  solid,
  onBack,
  onShare,
  onCart,
}: ProductDetailStickyHeaderProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { themeConfig } = useThemeRuntime();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchValue, setSearchValue] = useState("");
  const [searchTags, setSearchTags] = useState<ProductTag[]>([]);
  const categories = useProductStore((state) => state.categories);
  const loadCategories = useProductStore((state) => state.loadCategories);
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);
  const stateFrom = (location.state as { from?: string } | null)?.from;
  const searchBackTarget = stateFrom?.startsWith("/") && !stateFrom.startsWith("/search") ? stateFrom : "/";
  const openRoute = useCallback((path: string) => {
    navigateWithStoreTransition(navigate, appendThemePreviewParams(path));
  }, [navigate]);
  const submitSearch = useCallback((value: string) => {
    const keyword = value.trim();
    const target = keyword ? `/search?keyword=${encodeURIComponent(keyword)}` : "/search";
    navigateWithStoreTransition(navigate, appendThemePreviewParams(target), { replace: true, state: { from: searchBackTarget } });
  }, [navigate, searchBackTarget]);

  useEffect(() => {
    if (!searchOpen) return;
    void loadCategories();
    productService.fetchProductTags(16).then(setSearchTags).catch(() => setSearchTags([]));
  }, [loadCategories, searchOpen]);

  const searchCategoryOptions = useMemo(() => buildStoreSearchCategoryOptions({
    categories,
    onAll: () => openRoute("/categories"),
    onNew: () => openRoute(NEW_ARRIVAL_CATEGORY_PATH),
    onCategorySelect: (category) => openRoute(`/categories?cat=${encodeURIComponent(category.id)}`),
  }), [categories, openRoute]);

  const searchTagOptions = useMemo<StoreSearchTagOption[]>(() => searchTags.map((tag) => ({
    id: tag.id,
    label: storefrontCategoryName(tag.name),
    onSelect: () => openRoute(`/categories?tag_id=${encodeURIComponent(tag.id)}`),
  })), [openRoute, searchTags]);

  const BackBtn = solid ? SolidIconButton : ImmersiveIconButton;
  const ActionBtn = solid ? SolidIconButton : ImmersiveIconButton;

  return (
    <header
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-header pt-[env(safe-area-inset-top,0px)] lg:hidden",
        "transition-[background-color,box-shadow,border-color] duration-200 ease-out",
        solid
          ? cn("border-b shadow-[var(--theme-shadow)] backdrop-blur-xl", surfaceClass)
          : "border-b border-transparent bg-transparent",
      )}
      role="banner"
      aria-label="商品详情导航"
    >
      <div className="pointer-events-auto mx-auto flex h-[var(--store-tab-header-height)] w-full max-w-screen-xl items-center gap-2 px-3 md:gap-3 md:px-4">
        <BackBtn label="返回" onClick={onBack}>
          <ArrowLeft size={20} strokeWidth={2.25} />
        </BackBtn>

        <div
          className={cn(
            "min-w-0 flex-1 overflow-hidden transition-[opacity,max-width] duration-200 ease-out",
            solid ? "max-w-[999px] opacity-100" : "pointer-events-none max-w-0 opacity-0",
          )}
        >
          <StoreSearchLauncher
            className="sf-next-product-sticky-search-launcher"
            value={searchValue}
            placeholder={STORE_COPY.searchPlaceholder}
            onClick={() => setSearchOpen(true)}
          />
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-2">
          <ActionBtn label="分享商品" onClick={onShare}>
            <Share2 size={18} strokeWidth={2.25} />
          </ActionBtn>
          <ActionBtn label="购物车" onClick={onCart}>
            <ShoppingCart size={18} strokeWidth={2.25} />
          </ActionBtn>
        </div>
      </div>
      <StoreSearchDrawer
        open={searchOpen}
        value={searchValue}
        placeholder={STORE_COPY.searchPlaceholder}
        categories={searchCategoryOptions}
        tags={searchTagOptions}
        onClose={() => setSearchOpen(false)}
        onSubmit={submitSearch}
        onValueChange={setSearchValue}
        onClear={() => setSearchValue("")}
      />
    </header>
  );
}

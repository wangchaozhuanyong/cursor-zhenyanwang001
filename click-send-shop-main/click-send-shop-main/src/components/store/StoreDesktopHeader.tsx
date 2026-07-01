import { BadgePercent, Headphones, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from "react";
import { Link, useLocation } from "react-router-dom";
import DeferredStoreCartBadge from "@/components/store/DeferredStoreCartBadge";
import { StoreSearchDrawer, StoreSearchLauncher } from "@/components/store/StoreSearchDrawer";
import { buildStoreSearchCategoryOptions, type StoreSearchTagOption } from "@/components/store/storeSearchOptions";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo, useSiteInfoLoaded } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { STORE_COPY } from "@/constants/storeCopy";
import { isLoggedIn } from "@/utils/token";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { preloadStoreRoute } from "@/utils/storeRoutePreload";
import { isStoreNavPathVisible } from "@/utils/storeNavVisibility";
import StoreBrandLogo from "@/components/store/StoreBrandLogo";
import StoreLanguageSwitcher from "@/components/store/StoreLanguageSwitcher";
import * as productService from "@/services/productService";
import { useProductStore } from "@/stores/useProductStore";
import { stripPublicLocaleFromPathname, usePublicLocale } from "@/i18n/publicLocale";
import { NEW_ARRIVAL_CATEGORY_PATH } from "@/constants/newArrivalNavigation";
import { storefrontCategoryName } from "@/utils/storefrontCopySanitizer";
import type { ProductTag } from "@/types/product";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

type NavItem = { path: string; label: string; icon: typeof Home; enabled?: boolean };

function preloadHeaderRoute(path: string) {
  preloadStoreRoute(path);
}

function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

export default function StoreDesktopHeader({ className }: { className?: string }) {
  const navigate = useStorefrontNavigate();
  const location = useLocation();
  const siteInfo = useSiteInfo();
  const siteInfoLoaded = useSiteInfoLoaded();
  const capabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const { localizedPath, t } = usePublicLocale();
  const currentPathname = stripPublicLocaleFromPathname(location.pathname);
  const categories = useProductStore((state) => state.categories);
  const loadCategories = useProductStore((state) => state.loadCategories);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTags, setSearchTags] = useState<ProductTag[]>([]);
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const shouldReserveLogoSpace = Boolean(logoSrc) || !siteInfoLoaded;
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);
  const loggedIn = isLoggedIn();

  const navItems: NavItem[] = [
    { path: "/", label: t("common.home"), icon: Home, enabled: true },
    { path: "/categories", label: t("common.categories"), icon: LayoutGrid, enabled: capabilities.mallEnabled },
    { path: "/promotions", label: t("common.promotions"), icon: BadgePercent, enabled: capabilities.mallEnabled },
    { path: "/support-download?tab=support", label: t("common.support"), icon: Headphones, enabled: capabilities.customerServiceDownloadEnabled },
  ].filter((item) => item.enabled !== false && isStoreNavPathVisible(item.path, capabilities));

  const isActive = (path: string) => {
    const [base, query = ""] = path.split("?");
    if (base === "/") return currentPathname === "/";
    if (query) {
      const expected = new URLSearchParams(query);
      const current = new URLSearchParams(location.search);
      for (const [key, value] of expected.entries()) {
        if (current.get(key) !== value) return false;
      }
      return currentPathname === base;
    }
    if (base === "/categories") {
      const current = new URLSearchParams(location.search);
      return currentPathname === base && !current.has("keyword");
    }
    return currentPathname === base || currentPathname.startsWith(`${base}/`);
  };

  const openRoute = useCallback((path: string) => {
    preloadHeaderRoute(path);
    navigateWithStoreTransition(navigate, localizedPath(path));
  }, [localizedPath, navigate]);

  useEffect(() => {
    if (!capabilities.mallEnabled) return;
    void loadCategories();
    productService.fetchProductTags(16).then(setSearchTags).catch(() => setSearchTags([]));
  }, [capabilities.mallEnabled, loadCategories]);

  const submitSearch = (value: string) => {
    const keyword = value.trim();
    openRoute(keyword ? `/search?keyword=${encodeURIComponent(keyword)}` : "/search");
  };

  const searchCategoryOptions = useMemo(() => buildStoreSearchCategoryOptions({
    categories,
    activeCategoryId: currentPathname === "/categories" ? "all" : undefined,
    onAll: () => openRoute("/categories"),
    onNew: () => openRoute(NEW_ARRIVAL_CATEGORY_PATH),
    onCategorySelect: (category) => openRoute(`/categories?cat=${encodeURIComponent(category.id)}`),
  }), [categories, currentPathname, openRoute]);

  const searchTagOptions = useMemo<StoreSearchTagOption[]>(() => searchTags.map((tag) => ({
    id: tag.id,
    label: storefrontCategoryName(tag.name),
    onSelect: () => openRoute(`/categories?tag_id=${encodeURIComponent(tag.id)}`),
  })), [openRoute, searchTags]);

  const handleRouteLink = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    openRoute(path);
  };

  return (
    <header
      className={cn(
        "sf-next-header-desktop sf-next-glass-surface sticky top-0 z-header hidden border-b backdrop-blur-xl xl:flex",
        surfaceClass,
        className,
      )}
      style={{ height: "var(--sf-next-header-desktop-height, 4rem)" }}
    >
      <div className="mx-auto flex h-full w-full max-w-7xl min-w-0 items-center gap-4 px-6 xl:px-8">
        <Link
          to={localizedPath("/")}
          onClick={(event) => handleRouteLink(event, "/")}
          onMouseEnter={() => preloadHeaderRoute("/")}
          onFocus={() => preloadHeaderRoute("/")}
          className="sf-next-header-brand flex shrink-0 items-center gap-2.5"
          aria-label={`${siteName} ${t("common.home")}`}
        >
          {shouldReserveLogoSpace ? <StoreBrandLogo src={logoSrc} siteName={siteName} width={40} height={40} fallbackText="" /> : null}
          <span className="max-w-[10rem] truncate text-base font-bold tracking-wide text-[var(--theme-text-on-surface)]">
            {siteName}
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-1" aria-label="主导航">
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={localizedPath(item.path)}
                onClick={(event) => handleRouteLink(event, item.path)}
                onMouseEnter={() => preloadHeaderRoute(item.path)}
                onFocus={() => preloadHeaderRoute(item.path)}
                className={cn(
                  "sf-next-header-nav-link inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))] text-[var(--theme-primary)]"
                    : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]",
                )}
              >
                <Icon size={16} strokeWidth={active ? 2.25 : 1.75} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="min-w-0 flex-1 max-w-xl">
          {capabilities.mallEnabled ? (
            <StoreSearchLauncher
              placeholder={t("hero.searchPlaceholder")}
              className="sf-next-header-search-launcher"
              onClick={() => setSearchOpen(true)}
            />
          ) : (
            <div className="h-9" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <StoreLanguageSwitcher />
          {capabilities.mallEnabled ? (
            <UnifiedButton
              type="button"
              onMouseEnter={() => preloadHeaderRoute("/cart")}
              onFocus={() => preloadHeaderRoute("/cart")}
              onClick={() => openRoute("/cart")}
              className="sf-next-header-icon-button relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
              aria-label={t("common.cart")}
            >
              <ShoppingCart size={18} />
              <DeferredStoreCartBadge />
            </UnifiedButton>
          ) : null}

          {loggedIn ? (
            <UnifiedButton
              type="button"
              onMouseEnter={() => preloadHeaderRoute("/profile")}
              onFocus={() => preloadHeaderRoute("/profile")}
              onClick={() => openRoute("/profile")}
              className={cn(
                "sf-next-header-account-button inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium",
                isActive("/profile")
                  ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]"
                  : "border-[var(--theme-border)] text-[var(--theme-text)]",
              )}
            >
              <User size={16} />
              {t("common.myAccount")}
            </UnifiedButton>
          ) : (
            <UnifiedButton
              type="button"
              onClick={() => navigateWithStoreTransition(navigate, localizedPath("/login"), { state: { from: `${location.pathname}${location.search}` } })}
              className="sf-next-header-login-button rounded-full bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]"
            >
              {t("common.loginRegister")}
            </UnifiedButton>
          )}
        </div>
      </div>
      {capabilities.mallEnabled ? (
        <StoreSearchDrawer
          open={searchOpen}
          placeholder={t("hero.searchPlaceholder")}
          categories={searchCategoryOptions}
          tags={searchTagOptions}
          onClose={() => setSearchOpen(false)}
          onSubmit={submitSearch}
        />
      ) : null}
    </header>
  );
}

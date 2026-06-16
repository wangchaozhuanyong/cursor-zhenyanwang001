import { BadgePercent, Home, LayoutGrid, Search, ShoppingCart, User } from "lucide-react";
import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DeferredStoreCartBadge from "@/components/store/DeferredStoreCartBadge";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo, useSiteInfoLoaded } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { STORE_COPY } from "@/constants/storeCopy";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { preloadStoreRoute } from "@/utils/storeRoutePreload";
import { isStoreNavPathVisible } from "@/utils/storeNavVisibility";
import StoreBrandLogo from "@/components/store/StoreBrandLogo";
import StoreLanguageSwitcher from "@/components/store/StoreLanguageSwitcher";
import { stripPublicLocaleFromPathname, usePublicLocale } from "@/i18n/publicLocale";

type TabletNavItem = {
  path: string;
  label: string;
  icon: typeof Home;
  enabled?: boolean;
  badge?: "cart";
};

function preloadTabletRoute(path: string) {
  preloadStoreRoute(path);
}

function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

export default function StoreTabletBar({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const siteInfo = useSiteInfo();
  const siteInfoLoaded = useSiteInfoLoaded();
  const capabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const { localizedPath, t } = usePublicLocale();
  const currentPathname = stripPublicLocaleFromPathname(location.pathname);
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const shouldReserveLogoSpace = Boolean(logoSrc) || !siteInfoLoaded;
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);
  const navItems: TabletNavItem[] = [
    { path: "/", label: t("common.home"), icon: Home, enabled: true },
    { path: "/categories", label: t("common.categories"), icon: LayoutGrid, enabled: capabilities.mallEnabled },
    { path: "/promotions", label: t("common.promotions"), icon: BadgePercent, enabled: capabilities.mallEnabled },
    { path: "/cart", label: t("common.cart"), icon: ShoppingCart, enabled: capabilities.mallEnabled, badge: "cart" },
    { path: "/profile", label: t("common.myAccount"), icon: User, enabled: true },
  ].filter((item) => item.enabled !== false && isStoreNavPathVisible(item.path, capabilities));

  const isActive = (path: string) => {
    const base = path.split("?")[0];
    if (base === "/") return currentPathname === "/";
    return currentPathname === base || currentPathname.startsWith(`${base}/`);
  };

  const openRoute = (path: string) => {
    preloadTabletRoute(path);
    navigateWithStoreTransition(navigate, localizedPath(path));
  };

  const handleRouteLink = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    openRoute(path);
  };

  return (
    <header
      data-store-tablet-bar
      className={cn(
        "store-tablet-bar store-tablet-header store-glass-surface sticky top-0 z-header hidden border-b backdrop-blur-xl md:flex xl:hidden",
        surfaceClass,
        className,
      )}
      style={{ height: "var(--store-tablet-header-height, 3.25rem)" }}
    >
      <div className="store-tablet-bar-inner store-tablet-header-inner mx-auto flex h-full w-full max-w-7xl min-w-0 items-center gap-2 px-4 sm:px-5 md:px-6">
        <Link
          to={localizedPath("/")}
          onClick={(event) => handleRouteLink(event, "/")}
          onMouseEnter={() => preloadTabletRoute("/")}
          onFocus={() => preloadTabletRoute("/")}
          className="store-tablet-brand store-header-brand flex min-w-0 shrink-0 items-center gap-2"
          aria-label={`${siteName} ${t("common.home")}`}
        >
          {shouldReserveLogoSpace ? <StoreBrandLogo src={logoSrc} siteName={siteName} fallbackText="" /> : null}
          <span className="store-tablet-brand-name hidden max-w-[7rem] truncate text-sm font-semibold text-[var(--theme-text-on-surface)] sm:inline md:max-w-[8rem]">
            {siteName}
          </span>
        </Link>

        <nav
          className="store-tablet-nav grid min-w-0 flex-1 items-center gap-1 overflow-hidden"
          aria-label="\u4e3b\u5bfc\u822a"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={localizedPath(item.path)}
                onClick={(event) => handleRouteLink(event, item.path)}
                onMouseEnter={() => preloadTabletRoute(item.path)}
                onFocus={() => preloadTabletRoute(item.path)}
                aria-current={active ? "page" : undefined}
                className={cn("store-tablet-nav-link store-tablet-nav-item", active && "is-active")}
              >
                <span className="store-tablet-nav-icon">
                  <Icon size={17} strokeWidth={active ? 2.35 : 1.9} />
                  {item.badge === "cart" ? <DeferredStoreCartBadge /> : null}
                </span>
                <span className="store-tablet-nav-label truncate">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="store-tablet-actions flex shrink-0 items-center gap-1.5">
          {capabilities.mallEnabled ? (
            <UnifiedButton
              type="button"
              onMouseEnter={() => preloadTabletRoute("/search")}
              onFocus={() => preloadTabletRoute("/search")}
              onClick={() => openRoute("/search")}
              className="store-tablet-search-button store-header-icon-button flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
              aria-label={t("common.search")}
            >
              <Search size={18} />
            </UnifiedButton>
          ) : null}
          <StoreLanguageSwitcher compact />
        </div>
      </div>
    </header>
  );
}

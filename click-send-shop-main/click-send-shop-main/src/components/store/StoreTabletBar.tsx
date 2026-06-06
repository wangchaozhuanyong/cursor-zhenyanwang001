import { Headphones, Home, LayoutGrid, Search, ShoppingCart, User } from "lucide-react";
import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DeferredStoreCartBadge from "@/components/store/DeferredStoreCartBadge";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { STORE_COPY } from "@/constants/storeCopy";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { preloadStoreRoute } from "@/utils/storeRoutePreload";
import { isStoreNavPathVisible } from "@/utils/storeNavVisibility";

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
  const capabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);
  const navItems: TabletNavItem[] = [
    { path: "/", label: "\u9996\u9875", icon: Home, enabled: true },
    { path: "/categories", label: "\u5206\u7c7b", icon: LayoutGrid, enabled: capabilities.mallEnabled },
    { path: "/support-download?tab=support", label: "\u5ba2\u670d", icon: Headphones, enabled: capabilities.customerServiceDownloadEnabled },
    { path: "/cart", label: "\u8d2d\u7269\u8f66", icon: ShoppingCart, enabled: capabilities.mallEnabled, badge: "cart" },
    { path: "/profile", label: "\u6211\u7684", icon: User, enabled: true },
  ].filter((item) => item.enabled !== false && isStoreNavPathVisible(item.path, capabilities));

  const isActive = (path: string) => {
    const base = path.split("?")[0];
    if (base === "/") return location.pathname === "/";
    return location.pathname === base || location.pathname.startsWith(`${base}/`);
  };

  const openRoute = (path: string) => {
    preloadTabletRoute(path);
    navigateWithStoreTransition(navigate, path);
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
        "store-tablet-bar store-tablet-header store-glass-surface sticky top-0 z-header hidden border-b backdrop-blur-xl md:flex lg:hidden",
        surfaceClass,
        className,
      )}
      style={{ height: "var(--store-tablet-header-height, 4.25rem)" }}
    >
      <div className="store-tablet-bar-inner store-tablet-header-inner mx-auto flex h-full w-full max-w-screen-xl items-center gap-3 px-6">
        <Link
          to="/"
          onClick={(event) => handleRouteLink(event, "/")}
          onMouseEnter={() => preloadTabletRoute("/")}
          onFocus={() => preloadTabletRoute("/")}
          className="store-tablet-brand store-header-brand flex shrink-0 items-center gap-2"
          aria-label={`${siteName} \u9996\u9875`}
        >
          {logoSrc ? (
            <img src={logoSrc} alt={`${siteName} Logo`} width={36} height={36} className="store-brand-logo" />
          ) : null}
          <span className="store-tablet-brand-name hidden max-w-[8rem] truncate text-sm font-semibold text-[var(--theme-text-on-surface)] sm:inline">
            {siteName}
          </span>
        </Link>

        <nav
          className="store-tablet-nav"
          aria-label="\u4e3b\u5bfc\u822a"
          style={{ gridTemplateColumns: `repeat(${navItems.length}, minmax(0, 1fr))` }}
        >
          {navItems.map((item) => {
            const active = isActive(item.path);
            const Icon = item.icon;
            return (
              <Link
                key={item.path}
                to={item.path}
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
                <span className="store-tablet-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="store-tablet-actions flex shrink-0 items-center gap-2">
          {capabilities.mallEnabled ? (
            <UnifiedButton
              type="button"
              onMouseEnter={() => preloadTabletRoute("/search")}
              onFocus={() => preloadTabletRoute("/search")}
              onClick={() => openRoute("/search")}
              className="store-tablet-search-button store-header-icon-button flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
              aria-label="\u641c\u7d22"
            >
              <Search size={18} />
            </UnifiedButton>
          ) : null}
        </div>
      </div>
    </header>
  );
}

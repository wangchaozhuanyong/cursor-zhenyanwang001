import { GraduationCap, Headphones, Home, LayoutGrid, ShoppingCart, User, Wrench } from "lucide-react";
import type { MouseEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import DeferredStoreCartBadge from "@/components/store/DeferredStoreCartBadge";
import StoreSearchField from "@/components/store/StoreSearchField";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { STORE_COPY } from "@/constants/storeCopy";
import { isLoggedIn } from "@/utils/token";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { preloadStoreRoute } from "@/utils/storeRoutePreload";

type NavItem = { path: string; label: string; icon: typeof Home; enabled?: boolean };

function preloadHeaderRoute(path: string) {
  preloadStoreRoute(path);
}

function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

export default function StoreDesktopHeader({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);
  const loggedIn = isLoggedIn();

  const navItems: NavItem[] = [
    { path: "/", label: "首页", icon: Home, enabled: true },
    { path: "/categories", label: "全部分类", icon: LayoutGrid, enabled: capabilities.mallEnabled },
    { path: "/categories?keyword=本地服务", label: "本地服务", icon: Wrench, enabled: capabilities.mallEnabled },
    { path: "/categories?keyword=签证", label: "签证留学", icon: GraduationCap, enabled: capabilities.mallEnabled },
    { path: "/support-download?tab=support", label: "客服中心", icon: Headphones, enabled: true },
  ].filter((item) => item.enabled !== false);

  const isActive = (path: string) => {
    const [base, query = ""] = path.split("?");
    if (base === "/") return location.pathname === "/";
    if (query) {
      const expected = new URLSearchParams(query);
      const current = new URLSearchParams(location.search);
      for (const [key, value] of expected.entries()) {
        if (current.get(key) !== value) return false;
      }
      return location.pathname === base;
    }
    if (base === "/categories") {
      const current = new URLSearchParams(location.search);
      return location.pathname === base && !current.has("keyword");
    }
    return location.pathname === base || location.pathname.startsWith(`${base}/`);
  };

  const openRoute = (path: string) => {
    preloadHeaderRoute(path);
    navigateWithStoreTransition(navigate, path);
  };

  const handleRouteLink = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    openRoute(path);
  };

  return (
    <header
      className={cn(
        "store-glass-surface sticky top-0 z-header hidden border-b backdrop-blur-xl lg:flex",
        surfaceClass,
        className,
      )}
      style={{ height: "var(--store-desktop-header-height, 4rem)" }}
    >
      <div className="mx-auto flex h-full w-full max-w-screen-xl items-center gap-6 px-6 lg:px-8">
        <Link
          to="/"
          onClick={(event) => handleRouteLink(event, "/")}
          onMouseEnter={() => preloadHeaderRoute("/")}
          onFocus={() => preloadHeaderRoute("/")}
          className="store-header-brand flex shrink-0 items-center gap-2.5"
          aria-label={`${siteName} 首页`}
        >
          {logoSrc ? (
            <img src={logoSrc} alt={`${siteName} Logo`} width={40} height={40} className="store-brand-logo" />
          ) : null}
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
                to={item.path}
                onClick={(event) => handleRouteLink(event, item.path)}
                onMouseEnter={() => preloadHeaderRoute(item.path)}
                onFocus={() => preloadHeaderRoute(item.path)}
                className={cn(
                  "store-header-nav-link inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
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
            <StoreSearchField mode="navigate" placeholder={STORE_COPY.searchPlaceholder} onNavigate={() => openRoute("/search")} />
          ) : (
            <div className="h-9" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {capabilities.mallEnabled ? (
            <UnifiedButton
              type="button"
              onMouseEnter={() => preloadHeaderRoute("/cart")}
              onFocus={() => preloadHeaderRoute("/cart")}
              onClick={() => openRoute("/cart")}
              className="store-header-icon-button relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
              aria-label="购物车"
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
                "store-header-account-button inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium",
                isActive("/profile")
                  ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]"
                  : "border-[var(--theme-border)] text-[var(--theme-text)]",
              )}
            >
              <User size={16} />
              我的
            </UnifiedButton>
          ) : (
            <UnifiedButton
              type="button"
              onClick={() => navigateWithStoreTransition(navigate, "/login", { state: { from: location.pathname } })}
              className="store-header-login-button rounded-full bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]"
            >
              登录 / 注册
            </UnifiedButton>
          )}
        </div>
      </div>
    </header>
  );
}

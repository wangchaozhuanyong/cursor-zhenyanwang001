import { Search, ShoppingCart } from "lucide-react";
import type { MouseEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { Cart, GuestHome, MemberHome, Search as SearchPage } from "@/routes/publicLazyPages";
import { useCartStore } from "@/stores/useCartStore";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function preloadTabletRoute(path: string) {
  const base = path.split("?")[0];
  if (base === "/") {
    GuestHome.preload?.();
    MemberHome.preload?.();
  } else if (base === "/search") {
    SearchPage.preload?.();
  } else if (base === "/cart") {
    Cart.preload?.();
  }
}

function isPlainLeftClick(event: MouseEvent<HTMLElement>) {
  return event.button === 0 && !event.metaKey && !event.altKey && !event.ctrlKey && !event.shiftKey;
}

export default function StoreTabletBar({ className }: { className?: string }) {
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const totalItems = useCartStore((s) => s.totalItems());
  const siteName = siteInfo.siteName || "官方商城";
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);

  const openRoute = (path: string) => {
    preloadTabletRoute(path);
    navigateWithStoreTransition(navigate, path);
  };

  const handleHomeClick = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isPlainLeftClick(event)) return;
    event.preventDefault();
    openRoute("/");
  };

  return (
    <header
      className={cn(
        "store-glass-surface sticky top-0 z-header hidden border-b backdrop-blur-xl md:flex lg:hidden",
        surfaceClass,
        className,
      )}
      style={{ height: "var(--store-tablet-header-height, 3.25rem)" }}
    >
      <div className="mx-auto flex h-full w-full max-w-screen-xl items-center gap-3 px-6">
        <Link
          to="/"
          onClick={handleHomeClick}
          onMouseEnter={() => preloadTabletRoute("/")}
          onFocus={() => preloadTabletRoute("/")}
          className="store-header-brand flex shrink-0 items-center gap-2"
          aria-label={`${siteName} 首页`}
        >
          {logoSrc ? (
            <img src={logoSrc} alt={`${siteName} Logo`} width={36} height={36} className="store-brand-logo" />
          ) : null}
          <span className="hidden max-w-[8rem] truncate text-sm font-semibold text-[var(--theme-text-on-surface)] sm:inline">
            {siteName}
          </span>
        </Link>

        <div className="min-w-0 flex-1" />

        {capabilities.mallEnabled ? (
          <UnifiedButton
            type="button"
            onMouseEnter={() => preloadTabletRoute("/search")}
            onFocus={() => preloadTabletRoute("/search")}
            onClick={() => openRoute("/search")}
            className="store-header-icon-button flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
            aria-label="搜索"
          >
            <Search size={18} />
          </UnifiedButton>
        ) : null}

        {capabilities.mallEnabled ? (
          <UnifiedButton
            type="button"
            onMouseEnter={() => preloadTabletRoute("/cart")}
            onFocus={() => preloadTabletRoute("/cart")}
            onClick={() => openRoute("/cart")}
            className="store-header-icon-button relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
            aria-label="购物车"
          >
            <ShoppingCart size={18} />
            {totalItems > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--theme-danger)] px-1 text-[10px] font-bold text-[var(--theme-danger-foreground)]">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            ) : null}
          </UnifiedButton>
        ) : null}
      </div>
    </header>
  );
}

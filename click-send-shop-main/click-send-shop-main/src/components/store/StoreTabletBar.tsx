import { Search, ShoppingCart } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

/** 平板 Tab 页精简顶栏（768–1023px）；手机仍用各页 StoreTabHeader / StorePageHeader */
export default function StoreTabletBar({ className }: { className?: string }) {
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const totalItems = useCartStore((s) => s.totalItems());
  const siteName = siteInfo.siteName || "官方商城";
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);

  return (
    <header
      className={cn(
        "sticky top-0 z-header hidden border-b backdrop-blur-xl md:flex lg:hidden",
        surfaceClass,
        className,
      )}
      style={{ height: "var(--store-tablet-header-height, 3.25rem)" }}
    >
      <div className="mx-auto flex h-full w-full max-w-screen-xl items-center gap-3 px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2" aria-label={`${siteName} 首页`}>
          {logoSrc ? (
            <img src={logoSrc} alt="" width={36} height={36} className="store-brand-logo" />
          ) : null}
          <span className="hidden max-w-[8rem] truncate text-sm font-semibold text-[var(--theme-text-on-surface)] sm:inline">
            {siteName}
          </span>
        </Link>

        <div className="min-w-0 flex-1" />

        {capabilities.mallEnabled ? (
          <button
            type="button"
            onClick={() => navigate("/search")}
            className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
            aria-label="搜索"
          >
            <Search size={18} />
          </button>
        ) : null}

        {capabilities.mallEnabled ? (
          <button
            type="button"
            onClick={() => navigate("/cart")}
            className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)] text-[var(--theme-text)]"
            aria-label="购物车"
          >
            <ShoppingCart size={18} />
            {totalItems > 0 ? (
              <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--theme-danger)] px-1 text-[10px] font-bold text-[var(--theme-danger-foreground)]">
                {totalItems > 99 ? "99+" : totalItems}
              </span>
            ) : null}
          </button>
        ) : null}
      </div>
    </header>
  );
}

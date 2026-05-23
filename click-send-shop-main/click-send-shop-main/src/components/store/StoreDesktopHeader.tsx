import { Headphones, Home, LayoutGrid, ShoppingCart, Sparkles, User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import logoWebp from "@/assets/logo.webp";
import StoreSearchField from "@/components/store/StoreSearchField";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { cn } from "@/lib/utils";
import { useCartStore } from "@/stores/useCartStore";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { isLoggedIn } from "@/utils/token";

type NavItem = { path: string; label: string; icon: typeof Home; enabled?: boolean };

export default function StoreDesktopHeader({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const siteInfo = useSiteInfo();
  const capabilities = useSiteCapabilities();
  const { themeConfig } = useThemeRuntime();
  const totalItems = useCartStore((s) => s.totalItems());
  const siteName = siteInfo.siteName || "官方商城";
  const logoSrc = (siteInfo.logoUrl || "").trim() || logoWebp;
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);
  const loggedIn = isLoggedIn();

  const navItems: NavItem[] = [
    { path: "/", label: "首页", icon: Home, enabled: true },
    { path: "/categories", label: "分类", icon: LayoutGrid, enabled: capabilities.mallEnabled },
    { path: "/new-arrivals", label: "新品", icon: Sparkles, enabled: capabilities.mallEnabled },
    { path: "/support-download?tab=support", label: "客服", icon: Headphones, enabled: true },
  ].filter((item) => item.enabled !== false);

  const isActive = (path: string) => {
    const base = path.split("?")[0];
    if (base === "/") return location.pathname === "/";
    return location.pathname === base || location.pathname.startsWith(`${base}/`);
  };

  return (
    <header
      className={cn(
        "sticky top-0 z-header hidden border-b backdrop-blur-xl lg:flex",
        surfaceClass,
        className,
      )}
      style={{ height: "var(--store-desktop-header-height, 4rem)" }}
    >
      <div className="mx-auto flex h-full w-full max-w-screen-xl items-center gap-6 px-6 lg:px-8">
        <Link to="/" className="flex shrink-0 items-center gap-2.5" aria-label={`${siteName} 首页`}>
          <img src={logoSrc} alt="" width={32} height={32} className="h-8 w-8 rounded-md object-contain" />
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
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium transition-colors",
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
            <StoreSearchField mode="navigate" placeholder="搜索商品或品牌..." onNavigate={() => navigate("/search")} />
          ) : (
            <div className="h-9" />
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
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

          {loggedIn ? (
            <button
              type="button"
              onClick={() => navigate("/profile")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-medium",
                isActive("/profile")
                  ? "border-[var(--theme-primary)] bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]"
                  : "border-[var(--theme-border)] text-[var(--theme-text)]",
              )}
            >
              <User size={16} />
              我的
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login", { state: { from: location.pathname } })}
              className="rounded-full bg-[var(--theme-primary)] px-4 py-2 text-sm font-semibold text-[var(--theme-primary-foreground)]"
            >
              登录 / 注册
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

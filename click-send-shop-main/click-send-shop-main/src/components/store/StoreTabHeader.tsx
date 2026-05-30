import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import NotificationIconButton from "@/components/NotificationIconButton";
import StoreSearchField from "@/components/store/StoreSearchField";
import { useSiteInfo } from "@/hooks/useSiteInfo";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useNotificationStore } from "@/stores/useNotificationStore";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { cn } from "@/lib/utils";

export type StoreTabHeaderSearchMode = "navigate" | "filter" | "none";

type StoreTabHeaderProps = {
  /** navigate：点击/聚焦跳转搜索页；filter：页内筛选；none：无搜索（游客首页） */
  searchMode?: StoreTabHeaderSearchMode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** 覆盖右侧区域；不传则显示通知按钮 */
  rightSlot?: ReactNode;
  /** 是否在 Logo 旁显示站名（sm 及以上）；游客首页可在小屏也显示 */
  showSiteName?: boolean;
  showSiteNameMobile?: boolean;
  /** 首页顶栏统一 sticky；fixed 仅保留兼容旧用法 */
  position?: "sticky" | "fixed";
  className?: string;
};

export default function StoreTabHeader({
  searchMode = "navigate",
  searchValue = "",
  onSearchChange,
  searchPlaceholder,
  rightSlot,
  showSiteName = true,
  showSiteNameMobile = false,
  position = "sticky",
  className,
}: StoreTabHeaderProps) {
  const navigate = useNavigate();
  const siteInfo = useSiteInfo();
  const { themeConfig } = useThemeRuntime();
  const unreadCount = useNotificationStore((s) => s.unreadCount);

  const siteName = siteInfo.siteName || "官方商城";
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);

  const goSearch = () => navigate("/search");
  const goNotifications = () => navigate("/notifications");

  const nameClass = cn(
    "truncate font-bold tracking-widest text-[var(--theme-text-on-surface)]",
    showSiteNameMobile ? "text-lg" : "hidden text-lg sm:block",
  );

  return (
    <header
      className={cn(
        position === "fixed" ? "fixed left-0 right-0 top-0" : "sticky top-0",
        "z-header border-b backdrop-blur-xl pt-[env(safe-area-inset-top,0px)] md:hidden",
        surfaceClass,
        className,
      )}
    >
      <div className="mx-auto flex h-[var(--store-tab-header-height)] w-full max-w-screen-xl items-center gap-3 px-[var(--store-page-x)] sm:px-4 md:px-6">
        <button
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-2 border-0 bg-transparent p-0"
          onClick={() => navigate("/")}
          aria-label={`${siteName} 首页`}
        >
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={`${siteName} Logo`}
              width={36}
              height={36}
              className="store-brand-logo"
              loading="eager"
              decoding="async"
            />
          ) : null}
          {showSiteName ? <span className={nameClass}>{siteName}</span> : null}
        </button>

        {searchMode === "navigate" ? (
          <StoreSearchField
            mode="navigate"
            placeholder={searchPlaceholder ?? "搜索商品或品牌..."}
            onNavigate={goSearch}
          />
        ) : null}

        {searchMode === "filter" ? (
          <StoreSearchField
            mode="filter"
            placeholder={searchPlaceholder ?? "搜索商品..."}
            value={searchValue}
            onValueChange={onSearchChange}
          />
        ) : null}

        {searchMode === "none" ? <div className="min-w-0 flex-1" /> : null}

        <div className="flex shrink-0 items-center gap-2">
          {rightSlot ?? (
            <NotificationIconButton unreadCount={unreadCount} onClick={goNotifications} />
          )}
        </div>
      </div>
    </header>
  );
}

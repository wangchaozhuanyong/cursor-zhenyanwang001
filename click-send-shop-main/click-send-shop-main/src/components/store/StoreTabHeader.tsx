import { Bell } from "lucide-react";
import { lazy, Suspense, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import StoreSearchField from "@/components/store/StoreSearchField";
import { useSiteInfo, useSiteInfoLoaded } from "@/hooks/useSiteInfo";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { getStoreHeaderSurfaceClass } from "@/utils/storeHeaderSurface";
import { resolveSiteLogoUrl } from "@/utils/siteBrandAssets";
import { STORE_COPY } from "@/constants/storeCopy";
import { cn } from "@/lib/utils";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { isLoggedIn } from "@/utils/token";
import StoreBrandLogo from "@/components/store/StoreBrandLogo";

const StoreNotificationAction = lazy(() => import("@/components/store/StoreNotificationAction"));

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
  const siteInfoLoaded = useSiteInfoLoaded();
  const { themeConfig } = useThemeRuntime();

  const siteName = siteInfo.siteName || STORE_COPY.brandName;
  const logoSrc = resolveSiteLogoUrl(siteInfo);
  const shouldReserveLogoSpace = Boolean(logoSrc) || !siteInfoLoaded;
  const surfaceClass = getStoreHeaderSurfaceClass(themeConfig);

  const goSearch = () => navigate("/search");
  const goNotifications = () => navigate("/notifications");

  const nameClass = cn(
    "store-brand-name truncate tracking-normal",
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
      <div className="mx-auto flex h-[var(--store-tab-header-height)] w-full max-w-screen-xl items-center gap-2 px-[var(--store-page-x)] sm:px-4 md:px-6">
        <UnifiedButton
          type="button"
          className="flex shrink-0 cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0"
          onClick={() => navigate("/")}
          aria-label={`${siteName} 首页`}
        >
          {shouldReserveLogoSpace ? <StoreBrandLogo src={logoSrc} siteName={siteName} fallbackText="" /> : null}
          {showSiteName ? <span className={nameClass}>{siteName}</span> : null}
        </UnifiedButton>

        {searchMode === "navigate" ? (
          <StoreSearchField
            mode="navigate"
            placeholder={searchPlaceholder ?? STORE_COPY.searchPlaceholder}
            onNavigate={goSearch}
          />
        ) : null}

        {searchMode === "filter" ? (
          <StoreSearchField
            mode="filter"
            placeholder={searchPlaceholder ?? STORE_COPY.searchPlaceholder}
            value={searchValue}
            onValueChange={onSearchChange}
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
                className="store-notification-button relative flex h-[2.625rem] w-[2.625rem] overflow-visible items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/50"
                onClick={goNotifications}
                aria-label="消息通知"
              >
                <Bell size={16} className="relative z-[1] text-[var(--theme-text)]" />
              </UnifiedButton>
            )
          )}
        </div>
      </div>
    </header>
  );
}

import { BadgePercent, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DeferredStoreCartBadge from "@/components/store/DeferredStoreCartBadge";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { cn } from "@/lib/utils";
import { getBottomNavInnerClassName, getBottomNavShellClassName } from "@/utils/themeVisuals";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { isStoreNavPathVisible } from "@/utils/storeNavVisibility";
import { shouldHideBottomNav } from "./bottomNavVisibility";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { preloadStoreRoute } from "@/utils/storeRoutePreload";
import { rememberCurrentStoreScrollPosition } from "@/utils/storeScrollRestoration";
import { stripPublicLocaleFromPathname, usePublicLocale } from "@/i18n/publicLocale";

/** 轻触允许的最大位移（px）；略放宽，避免「刚滑完页面就点底栏」被误判为滑动 */
const TAP_MOVE_THRESHOLD = 28;
type ActivePointer = {
  path: string;
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  maxMove: number;
};

function preloadTabRoute(path: string) {
  return preloadStoreRoute(path, "intent") ?? Promise.resolve();
}

function preloadIdleTabRoute(path: string) {
  preloadStoreRoute(path, "idle");
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const { localizedPath, t } = usePublicLocale();
  const navStyle = themeConfig.navStyle;
  const capabilities = useSiteCapabilities();
  const activePointerRef = useRef<ActivePointer | null>(null);
  const lastNavTapRef = useRef<{ path: string; at: number } | null>(null);
  const [badgeBump, setBadgeBump] = useState(false);
  const [pendingPath, setPendingPath] = useState<string | null>(null);
  const currentPathname = stripPublicLocaleFromPathname(location.pathname);
  const tabs = [
    { path: "/", label: t("common.home"), icon: Home },
    { path: "/categories", label: t("common.categories"), icon: LayoutGrid },
    { path: "/promotions", label: t("common.promotions"), icon: BadgePercent },
    { path: "/cart", label: t("common.cart"), icon: ShoppingCart },
    { path: "/profile", label: t("common.myAccount"), icon: User },
  ];

  useEffect(() => {
    let timer: number | undefined;
    const onBump = () => {
      setBadgeBump(true);
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => setBadgeBump(false), 420);
    };
    window.addEventListener("cart:badge-bump", onBump);
    return () => {
      window.removeEventListener("cart:badge-bump", onBump);
      if (timer) window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    setPendingPath(null);
  }, [currentPathname, location.search]);

  const handleNavigate = useCallback((path: string) => {
    const base = path.split("?")[0];
    const targetSearch = path.includes("?") ? `?${path.split("?")[1]}` : "";
    if (currentPathname === base) {
      if (targetSearch && location.search !== targetSearch) {
        rememberCurrentStoreScrollPosition();
        navigate(localizedPath(path));
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return;
    }
    rememberCurrentStoreScrollPosition();
    navigateWithStoreTransition(navigate, localizedPath(path));
  }, [currentPathname, localizedPath, location.search, navigate]);

  /** 避免 pointerup + click 双触发；兼容不支持 Pointer Events 的浏览器 */
  const activateTab = useCallback((path: string) => {
    const now = Date.now();
    const last = lastNavTapRef.current;
    if (last && last.path === path && now - last.at < 400) return;
    lastNavTapRef.current = { path, at: now };
    setPendingPath(path);
    void preloadTabRoute(path);
    handleNavigate(path);
    window.setTimeout(() => {
      setPendingPath((value) => (value === path ? null : value));
    }, 900);
  }, [handleNavigate]);

  if (shouldHideBottomNav(location.pathname)) return null;

  const isTabActive = (path: string) => {
    const base = path.split("?")[0];
    return currentPathname === base;
  };
  const isTabPending = (path: string) => {
    const base = path.split("?")[0];
    const pendingBase = pendingPath?.split("?")[0];
    return Boolean(pendingBase && pendingBase === base && currentPathname !== base);
  };
  const visibleTabs = tabs.filter((tab) => isStoreNavPathVisible(tab.path, capabilities));

  const isTapIntent = (active: ActivePointer) => active.maxMove <= TAP_MOVE_THRESHOLD;

  const clearPointerCapture = (target: EventTarget & Element, pointerId: number) => {
    try {
      if (target.hasPointerCapture?.(pointerId)) {
        target.releasePointerCapture(pointerId);
      }
    } catch {
      // ignore
    }
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>, path: string) => {
    if (event.button !== 0) return;
    const target = event.currentTarget;
    try {
      target.setPointerCapture(event.pointerId);
    } catch {
      // 部分国产浏览器不支持 pointer capture
    }
    activePointerRef.current = {
      path,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startTime: Date.now(),
      maxMove: 0,
    };
    setPendingPath(path);
    void preloadTabRoute(path);
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = Math.abs(event.clientX - active.startX);
    const dy = Math.abs(event.clientY - active.startY);
    active.maxMove = Math.max(active.maxMove, dx, dy);
    if (!isTapIntent(active)) {
      setPendingPath((value) => (value === active.path ? null : value));
    }
  };

  const finishPointer = (event: PointerEvent<HTMLButtonElement>, path: string) => {
    const active = activePointerRef.current;
    if (!active || active.path !== path || active.pointerId !== event.pointerId) return;
    activePointerRef.current = null;
    clearPointerCapture(event.currentTarget, event.pointerId);

    if (!isTapIntent(active)) {
      setPendingPath((value) => (value === path ? null : value));
      return;
    }

    activateTab(path);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    activePointerRef.current = null;
    clearPointerCapture(event.currentTarget, event.pointerId);
    setPendingPath((value) => (value === active.path ? null : value));
  };

  return (
    <nav
      className={cn(
        "store-bottom-nav store-bottom-nav--stable",
        getBottomNavShellClassName(navStyle, "fixed"),
        "md:hidden translate-y-0 opacity-100",
      )}
      data-theme-nav-style={navStyle}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className={cn("store-bottom-nav-inner store-bottom-nav__inner", getBottomNavInnerClassName(navStyle))} style={{ touchAction: "manipulation" }}>
        <div className="store-bottom-nav__grid grid h-[68px] items-center px-1" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
          {visibleTabs.map((tab) => {
            const isCurrent = isTabActive(tab.path);
            const isActive = isCurrent || isTabPending(tab.path);
            const Icon = tab.icon;
            return (
              <UnifiedButton
                key={tab.path}
                type="button"
                data-store-nav-path={tab.path}
                aria-current={isCurrent ? "page" : undefined}
                aria-label={tab.label}
                onPointerDown={(event) => handlePointerDown(event, tab.path)}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => finishPointer(event, tab.path)}
                onPointerCancel={handlePointerCancel}
                onMouseEnter={() => preloadIdleTabRoute(tab.path)}
                onFocus={() => preloadIdleTabRoute(tab.path)}
                onClick={() => activateTab(tab.path)}
                className="store-bottom-nav-item relative flex min-h-0 w-full cursor-pointer select-none flex-col items-center justify-center gap-1 border-0 bg-transparent px-1 py-2"
              >
                <span
                  className={`store-bottom-nav-icon relative flex h-8 min-w-8 items-center justify-center rounded-full px-2 transition-transform duration-150 ${
                    isActive
                      ? "scale-105 bg-[var(--store-icon-bg)] shadow-[inset_0_0_0_1px_var(--store-icon-border)]"
                      : "bg-transparent"
                  }`}
                >
                  <Icon
                    size={20}
                    className={isActive ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-muted)]"}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {tab.path.startsWith("/cart") ? <DeferredStoreCartBadge bumped={badgeBump} variant="bottom" /> : null}
                </span>
                <span
                  className={`store-bottom-nav-label text-xs leading-tight ${
                    isActive
                      ? "font-bold text-[var(--theme-primary)]"
                      : "font-medium text-[var(--theme-text-muted)]"
                  }`}
                >
                  {tab.label}
                </span>
              </UnifiedButton>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

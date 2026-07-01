import { BadgePercent, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import DeferredStoreCartBadge from "@/components/store/DeferredStoreCartBadge";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { cn } from "@/lib/utils";
import { getBottomNavInnerClassName, getBottomNavShellClassName } from "@/utils/themeVisuals";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { isStoreNavPathVisible } from "@/utils/storeNavVisibility";
import { shouldHideBottomNav } from "./bottomNavVisibility";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { preloadStoreRouteLazy } from "@/utils/preloadStoreRouteLazy";
import { getRememberedStoreTabPath, rememberCurrentStoreScrollPosition } from "@/utils/storeScrollRestoration";
import { stripPublicLocaleFromPathname, usePublicLocale } from "@/i18n/publicLocale";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";
import { useStorefrontMotionState } from "@/components/storefront-motion/useStorefrontMotionState";

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

function preloadIdleTabRoute(path: string) {
  void preloadStoreRouteLazy(path, "idle");
}

function shouldActivateOnPointerDown(pointerType: string) {
  return pointerType === "touch" || pointerType === "pen";
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useStorefrontNavigate();
  const motion = useStorefrontMotionState();
  const { themeConfig } = useThemeRuntime();
  const { localizedPath, t } = usePublicLocale();
  const navStyle = themeConfig.navStyle;
  const capabilities = useSiteCapabilities();
  const activePointerRef = useRef<ActivePointer | null>(null);
  const lastNavTapRef = useRef<{ path: string; at: number } | null>(null);
  const [badgeBump, setBadgeBump] = useState(false);
  const [intentPath, setIntentPath] = useState<string | null>(null);
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
    setIntentPath(null);
  }, [currentPathname, location.search]);

  const handleNavigate = useCallback((path: string) => {
    if (motion.phase === "pending") return;
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
    navigateWithStoreTransition(navigate, localizedPath(getRememberedStoreTabPath(path)));
  }, [currentPathname, localizedPath, location.search, motion.phase, navigate]);

  /** 避免 pointerdown/pointerup/click 双触发；兼容不支持 Pointer Events 的浏览器 */
  const activateTab = useCallback((path: string) => {
    if (motion.phase === "pending") return;
    const now = Date.now();
    const last = lastNavTapRef.current;
    if (last && last.path === path && now - last.at < 400) return;
    lastNavTapRef.current = { path, at: now };
    setIntentPath(path);
    handleNavigate(path);
    window.setTimeout(() => {
      setIntentPath((value) => (value === path ? null : value));
    }, 900);
  }, [handleNavigate, motion.phase]);

  if (shouldHideBottomNav(location.pathname)) return null;

  const isTabActive = (path: string) => {
    const base = path.split("?")[0];
    return currentPathname === base;
  };
  const isTabPending = (path: string) => {
    const base = path.split("?")[0];
    const motionPendingBase = motion.pendingPath?.split("?")[0];
    const pendingBase = (motionPendingBase || intentPath?.split("?")[0]) ?? null;
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
    if (motion.phase === "pending") return;
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
    setIntentPath(path);
    if (shouldActivateOnPointerDown(event.pointerType)) {
      activateTab(path);
    }
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = Math.abs(event.clientX - active.startX);
    const dy = Math.abs(event.clientY - active.startY);
    active.maxMove = Math.max(active.maxMove, dx, dy);
    if (!isTapIntent(active)) {
      setIntentPath((value) => (value === active.path ? null : value));
    }
  };

  const finishPointer = (event: PointerEvent<HTMLButtonElement>, path: string) => {
    const active = activePointerRef.current;
    if (!active || active.path !== path || active.pointerId !== event.pointerId) return;
    activePointerRef.current = null;
    clearPointerCapture(event.currentTarget, event.pointerId);

    if (!isTapIntent(active)) {
      setIntentPath((value) => (value === path ? null : value));
      return;
    }

    activateTab(path);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    activePointerRef.current = null;
    clearPointerCapture(event.currentTarget, event.pointerId);
    setIntentPath((value) => (value === active.path ? null : value));
  };

  return (
    <nav
      className={cn(
        "sf-next-bottom-nav sf-next-bottom-nav--stable",
        getBottomNavShellClassName(navStyle, "sticky"),
        "md:hidden translate-y-0 opacity-100",
      )}
      data-theme-nav-style={navStyle}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className={cn("sf-next-bottom-nav-inner sf-next-bottom-nav__inner", getBottomNavInnerClassName(navStyle))} style={{ touchAction: "manipulation" }}>
        <div className="sf-next-bottom-nav__grid grid h-[68px] items-center px-1" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
          {visibleTabs.map((tab) => {
            const isCurrent = isTabActive(tab.path);
            const isPending = isTabPending(tab.path);
            const isLocked = motion.phase === "pending" && !isCurrent;
            const Icon = tab.icon;
            return (
              <UnifiedButton
                key={tab.path}
                type="button"
                data-store-nav-path={tab.path}
                data-pending={isPending ? "true" : undefined}
                aria-current={isCurrent ? "page" : undefined}
                aria-disabled={isLocked ? true : undefined}
                aria-label={tab.label}
                onPointerDown={(event) => handlePointerDown(event, tab.path)}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => finishPointer(event, tab.path)}
                onPointerCancel={handlePointerCancel}
                onMouseEnter={() => preloadIdleTabRoute(tab.path)}
                onFocus={() => preloadIdleTabRoute(tab.path)}
                onClick={() => activateTab(tab.path)}
                className="sf-next-bottom-nav-item relative flex min-h-0 w-full cursor-pointer select-none flex-col items-center justify-center gap-1 border-0 bg-transparent px-1 py-2"
              >
                <span
                  className={`sf-next-bottom-nav-icon relative flex h-8 min-w-8 items-center justify-center rounded-full px-2 transition-transform duration-150 ${
                    isCurrent
                      ? "scale-105 bg-[var(--store-icon-bg)] shadow-[inset_0_0_0_1px_var(--store-icon-border)]"
                      : "bg-transparent"
                  }`}
                >
                  <Icon
                    size={20}
                    className={isCurrent ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-muted)]"}
                    strokeWidth={isCurrent ? 2.5 : 1.8}
                  />
                  {tab.path.startsWith("/cart") ? <DeferredStoreCartBadge bumped={badgeBump} variant="bottom" /> : null}
                </span>
                <span
                  className={`sf-next-bottom-nav-label text-xs leading-tight ${
                    isCurrent
                      ? "font-bold text-[var(--theme-primary)]"
                      : isPending
                        ? "font-semibold text-[var(--theme-primary)]"
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

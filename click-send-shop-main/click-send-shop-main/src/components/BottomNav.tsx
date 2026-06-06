import { Headphones, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { type PointerEvent, useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import DeferredStoreCartBadge from "@/components/store/DeferredStoreCartBadge";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { cn } from "@/lib/utils";
import { getBottomNavInnerClassName, getBottomNavShellClassName } from "@/utils/themeVisuals";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { isStoreNavPathVisible } from "@/utils/storeNavVisibility";
import { shouldHideBottomNav } from "./bottomNavVisibility";
import { useStoreScrollChrome } from "@/contexts/StoreScrollChromeProvider";
import { navigateWithStoreTransition } from "@/utils/storeNavigationTransition";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { preloadStoreRoute } from "@/utils/storeRoutePreload";

function isEditableElement(el: Element | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName?.toLowerCase();
  return tag === "input" || tag === "textarea" || tag === "select";
}

const tabs = [
  { path: "/", label: "\u9996\u9875", icon: Home },
  { path: "/categories", label: "\u5206\u7c7b", icon: LayoutGrid },
  { path: "/support-download?tab=support", label: "客服", icon: Headphones },
  { path: "/cart", label: "\u8d2d\u7269\u8f66", icon: ShoppingCart },
  { path: "/profile", label: "\u6211\u7684", icon: User },
];

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
  preloadStoreRoute(path);
}

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const navStyle = themeConfig.navStyle;
  const capabilities = useSiteCapabilities();
  const activePointerRef = useRef<ActivePointer | null>(null);
  const lastNavTapRef = useRef<{ path: string; at: number } | null>(null);
  const [badgeBump, setBadgeBump] = useState(false);
  const [routeReveal, setRouteReveal] = useState(false);
  const [inputActive, setInputActive] = useState(false);

  const barsHidden = useStoreScrollChrome((s) => s.barsHidden);
  const isAtTop = useStoreScrollChrome((s) => s.isAtTop);
  const autoHideEnabled = useStoreScrollChrome((s) => s.autoHideEnabled);

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
    // 路由变化时短暂强制显示，避免底栏残留隐藏态造成误判
    if (!autoHideEnabled) return;
    setRouteReveal(true);
    const t = window.setTimeout(() => setRouteReveal(false), 420);
    return () => window.clearTimeout(t);
  }, [location.pathname, autoHideEnabled]);

  useEffect(() => {
    const onFocusIn = () => setInputActive(isEditableElement(document.activeElement));
    const onFocusOut = () => setInputActive(false);
    window.addEventListener("focusin", onFocusIn);
    window.addEventListener("focusout", onFocusOut);
    return () => {
      window.removeEventListener("focusin", onFocusIn);
      window.removeEventListener("focusout", onFocusOut);
    };
  }, []);

  const handleNavigate = useCallback((path: string) => {
    const base = path.split("?")[0];
    const targetSearch = path.includes("?") ? `?${path.split("?")[1]}` : "";
    if (location.pathname === base) {
      if (targetSearch && location.search !== targetSearch) {
        navigate(path);
        return;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return;
    }
    preloadTabRoute(path);
    navigateWithStoreTransition(navigate, path);
  }, [location.pathname, location.search, navigate]);

  /** 避免 pointerup + click 双触发；兼容不支持 Pointer Events 的浏览器 */
  const activateTab = useCallback((path: string) => {
    const now = Date.now();
    const last = lastNavTapRef.current;
    if (last && last.path === path && now - last.at < 400) return;
    lastNavTapRef.current = { path, at: now };
    handleNavigate(path);
  }, [handleNavigate]);

  if (shouldHideBottomNav(location.pathname)) return null;

  const forceVisible = isAtTop || inputActive || routeReveal;
  const shouldHideByScroll = autoHideEnabled && barsHidden && !forceVisible;

  const isTabActive = (path: string) => {
    const base = path.split("?")[0];
    return location.pathname === base;
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
    preloadTabRoute(path);
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
  };

  const handlePointerMove = (event: PointerEvent<HTMLButtonElement>) => {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    const dx = Math.abs(event.clientX - active.startX);
    const dy = Math.abs(event.clientY - active.startY);
    active.maxMove = Math.max(active.maxMove, dx, dy);
  };

  const finishPointer = (event: PointerEvent<HTMLButtonElement>, path: string) => {
    const active = activePointerRef.current;
    if (!active || active.path !== path || active.pointerId !== event.pointerId) return;
    activePointerRef.current = null;
    clearPointerCapture(event.currentTarget, event.pointerId);

    if (!isTapIntent(active)) return;

    activateTab(path);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    activePointerRef.current = null;
    clearPointerCapture(event.currentTarget, event.pointerId);
  };

  return (
    <nav
      className={cn(
        "store-bottom-nav",
        getBottomNavShellClassName(navStyle, "fixed"),
        "lg:hidden transition-transform transition-opacity duration-200 ease-out motion-reduce:transition-none",
        shouldHideByScroll
          ? "translate-y-[calc(100%+env(safe-area-inset-bottom,0px))] opacity-0 pointer-events-none"
          : "translate-y-0 opacity-100",
      )}
      data-theme-nav-style={navStyle}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className={cn("store-bottom-nav-inner", getBottomNavInnerClassName(navStyle))} style={{ touchAction: "manipulation" }}>
        <div className="grid h-[68px] items-center px-1" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
          {visibleTabs.map((tab) => {
            const isActive = isTabActive(tab.path);
            const Icon = tab.icon;
            return (
              <UnifiedButton
                key={tab.path}
                type="button"
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
                onPointerDown={(event) => handlePointerDown(event, tab.path)}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => finishPointer(event, tab.path)}
                onPointerCancel={handlePointerCancel}
                onMouseEnter={() => preloadTabRoute(tab.path)}
                onFocus={() => preloadTabRoute(tab.path)}
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

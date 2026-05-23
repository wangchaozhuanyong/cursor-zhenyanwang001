import { Headphones, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { type PointerEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useCartStore } from "@/stores/useCartStore";
import { isLoggedIn } from "@/utils/token";
import { cn } from "@/lib/utils";
import { getBottomNavInnerClassName, getBottomNavShellClassName } from "@/utils/themeVisuals";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";

const tabs = [
  { path: "/", label: "\u9996\u9875", icon: Home },
  { path: "/categories", label: "\u5206\u7c7b", icon: LayoutGrid },
  { path: "/support-download?tab=support", label: "客服", icon: Headphones },
  { path: "/cart", label: "\u8d2d\u7269\u8f66", icon: ShoppingCart },
  { path: "/profile", label: "\u6211\u7684", icon: User },
];

/** 杞昏Е鍏佽鐨勬渶澶т綅绉伙紙px锛夛紱鐣ユ斁瀹斤紝閬垮厤銆屽垰婊戝畬椤甸潰灏辩偣搴曟爮銆嶈璇垽涓烘粦鍔?*/
const TAP_MOVE_THRESHOLD = 28;
type ActivePointer = {
  path: string;
  pointerId: number;
  startX: number;
  startY: number;
  startTime: number;
  maxMove: number;
};

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const navStyle = themeConfig.navStyle;
  const capabilities = useSiteCapabilities();
  const totalItems = useCartStore((s) => s.totalItems());
  const activePointerRef = useRef<ActivePointer | null>(null);
  const [badgeBump, setBadgeBump] = useState(false);

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

  if (location.pathname.startsWith("/checkout")) return null;

  const requiresAuth = (path: string) => path.split("?")[0] === "/profile";

  const isTabActive = (path: string) => {
    const base = path.split("?")[0];
    return location.pathname === base;
  };
  const visibleTabs = tabs.filter((tab) => capabilities.mallEnabled || !["/categories", "/cart"].includes(tab.path.split("?")[0]));

  const handleNavigate = (path: string) => {
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
    if (requiresAuth(path) && !isLoggedIn()) {
      navigate("/login", { state: { from: path } });
      return;
    }
    navigate(path);
  };

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
    target.setPointerCapture(event.pointerId);
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

    event.preventDefault();
    handleNavigate(path);
  };

  const handlePointerCancel = (event: PointerEvent<HTMLButtonElement>) => {
    const active = activePointerRef.current;
    if (!active || active.pointerId !== event.pointerId) return;
    activePointerRef.current = null;
    clearPointerCapture(event.currentTarget, event.pointerId);
  };

  return (
    <nav
      className={cn(getBottomNavShellClassName(navStyle, "fixed"), "lg:hidden")}
      data-theme-nav-style={navStyle}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        touchAction: "none",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className={getBottomNavInnerClassName(navStyle)} style={{ touchAction: "none" }}>
        <div className="grid h-[68px] items-center px-1" style={{ gridTemplateColumns: `repeat(${visibleTabs.length}, minmax(0, 1fr))` }}>
          {visibleTabs.map((tab) => {
            const isActive = isTabActive(tab.path);
            const Icon = tab.icon;
            return (
              <button
                key={tab.path}
                type="button"
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
                onPointerDown={(event) => handlePointerDown(event, tab.path)}
                onPointerMove={handlePointerMove}
                onPointerUp={(event) => finishPointer(event, tab.path)}
                onPointerCancel={handlePointerCancel}
                onClick={(event) => {
                  if (event.pointerType === "touch") {
                    event.preventDefault();
                    return;
                  }
                  handleNavigate(tab.path);
                }}
                className="relative flex min-h-0 w-full cursor-pointer select-none flex-col items-center justify-center gap-1 border-0 bg-transparent px-1 py-2"
              >
                <span
                  className={`relative flex h-8 min-w-8 items-center justify-center rounded-full px-2 transition-transform duration-150 ${
                    isActive
                      ? "scale-105 bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))]"
                      : "bg-transparent"
                  }`}
                >
                  <Icon
                    size={20}
                    className={isActive ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-muted)]"}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {tab.path.startsWith("/cart") && totalItems > 0 && (
                    <motion.span
                      animate={badgeBump ? { scale: [1, 1.35, 1] } : { scale: 1 }}
                      transition={{ duration: 0.35 }}
                      className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--theme-danger)] px-1 text-[10px] font-bold text-[var(--theme-danger-foreground)]"
                    >
                      {totalItems > 99 ? "99+" : totalItems}
                    </motion.span>
                  )}
                </span>
                <span
                  className={`text-xs leading-tight ${
                    isActive
                      ? "font-bold text-[var(--theme-primary)]"
                      : "font-medium text-[var(--theme-text-muted)]"
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

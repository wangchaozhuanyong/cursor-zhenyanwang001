import { Headphones, Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { type TouchEvent, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useCartStore } from "@/stores/useCartStore";
import { isLoggedIn } from "@/utils/token";
import { getBottomNavInnerClassName, getBottomNavShellClassName } from "@/utils/themeVisuals";

const tabs = [
  { path: "/", label: "\u9996\u9875", icon: Home },
  { path: "/categories", label: "\u5206\u7c7b", icon: LayoutGrid },
  { path: "/support-download", label: "\u5ba2\u670d\u4e0b\u8f7d", icon: Headphones },
  { path: "/cart", label: "\u8d2d\u7269\u8f66", icon: ShoppingCart },
  { path: "/profile", label: "\u6211\u7684", icon: User },
];

const TAP_MOVE_THRESHOLD = 12;
const TOUCH_CLICK_SUPPRESS_MS = 650;

type TouchPoint = {
  x: number;
  y: number;
  time: number;
};

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const navStyle = themeConfig.navStyle;
  const totalItems = useCartStore((s) => s.totalItems());
  const touchStartRef = useRef<TouchPoint | null>(null);
  const handledTouchRef = useRef<{ path: string; time: number } | null>(null);
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

  const requiresAuth = (path: string) => path === "/profile";
  const handleNavigate = (path: string) => {
    if (location.pathname === path) {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
      return;
    }
    if (requiresAuth(path) && !isLoggedIn()) {
      navigate("/login", { state: { from: path } });
      return;
    }
    navigate(path);
  };

  const handleTouchStart = (event: TouchEvent<HTMLAnchorElement>) => {
    const touch = event.changedTouches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY, time: Date.now() };
  };

  const handleTouchEnd = (event: TouchEvent<HTMLAnchorElement>, path: string) => {
    const start = touchStartRef.current;
    const touch = event.changedTouches[0];
    touchStartRef.current = null;
    if (!start || !touch) return;

    const movedX = Math.abs(touch.clientX - start.x);
    const movedY = Math.abs(touch.clientY - start.y);
    if (movedX > TAP_MOVE_THRESHOLD || movedY > TAP_MOVE_THRESHOLD) return;

    event.preventDefault();
    handledTouchRef.current = { path, time: Date.now() };
    handleNavigate(path);
  };

  return (
    <nav
      className={getBottomNavShellClassName(navStyle, "fixed")}
      data-theme-nav-style={navStyle}
      style={{
        paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
        touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <div className={getBottomNavInnerClassName(navStyle)}>
        <div className="grid h-[68px] grid-cols-5 items-center px-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            return (
              <a
                key={tab.path}
                href={tab.path}
                aria-current={isActive ? "page" : undefined}
                aria-label={tab.label}
                onTouchStart={handleTouchStart}
                onTouchCancel={() => {
                  touchStartRef.current = null;
                }}
                onTouchEnd={(event) => handleTouchEnd(event, tab.path)}
                onClick={(event) => {
                  const handledTouch = handledTouchRef.current;
                  if (handledTouch?.path === tab.path && Date.now() - handledTouch.time < TOUCH_CLICK_SUPPRESS_MS) {
                    event.preventDefault();
                    handledTouchRef.current = null;
                    return;
                  }
                  event.preventDefault();
                  handleNavigate(tab.path);
                }}
                className="relative flex min-h-0 touch-manipulation select-none flex-col items-center justify-center gap-1 bg-transparent px-1 py-2 no-underline"
                draggable={false}
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
                  {tab.path === "/cart" && totalItems > 0 && (
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
                  className={`text-[11px] leading-tight ${
                    isActive
                      ? "font-bold text-[var(--theme-primary)]"
                      : "font-medium text-[var(--theme-text-muted)]"
                  }`}
                >
                  {tab.label}
                </span>
              </a>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

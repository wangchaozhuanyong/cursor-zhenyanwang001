import { Home, LayoutGrid, ShoppingCart, Sparkles, User } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { useLocation, useNavigate } from "react-router-dom";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";
import { useCartStore } from "@/stores/useCartStore";
import { isLoggedIn } from "@/utils/token";
import { getBottomNavInnerClassName, getBottomNavShellClassName } from "@/utils/themeVisuals";

const tabs = [
  { path: "/", label: "首页", icon: Home },
  { path: "/categories", label: "分类", icon: LayoutGrid },
  { path: "/new-arrivals", label: "新品", icon: Sparkles },
  { path: "/cart", label: "购物车", icon: ShoppingCart },
  { path: "/profile", label: "我的", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { themeConfig } = useThemeRuntime();
  const navStyle = themeConfig.navStyle;
  const totalItems = useCartStore((s) => s.totalItems());
  const lastTouchNavAtRef = useRef(0);
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

  return (
    <nav
      className={getBottomNavShellClassName(navStyle, "fixed")}
      data-theme-nav-style={navStyle}
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)", touchAction: "manipulation" }}
    >
      <div className={getBottomNavInnerClassName(navStyle)}>
        <div className="grid h-[68px] grid-cols-5 items-center px-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            const Icon = tab.icon;
            const fire = () => handleNavigate(tab.path);
            return (
              <button
                key={tab.path}
                type="button"
                onClick={() => {
                  if (Date.now() - lastTouchNavAtRef.current < 350) return;
                  fire();
                }}
                onPointerUp={(event) => {
                  if (event.pointerType !== "touch") return;
                  lastTouchNavAtRef.current = Date.now();
                  fire();
                }}
                className="relative flex min-h-0 touch-manipulation flex-col items-center justify-center gap-1 bg-transparent px-1 py-2"
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
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

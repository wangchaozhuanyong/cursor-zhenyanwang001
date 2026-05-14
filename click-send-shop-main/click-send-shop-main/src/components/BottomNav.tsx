import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/useCartStore";
import { SquishButton } from "@/modules/micro-interactions";
import { motion } from "framer-motion";
import { useThemeRuntime } from "@/contexts/ThemeRuntimeProvider";

const tabs = [
  { path: "/", label: "首页", icon: Home },
  { path: "/categories", label: "分类", icon: LayoutGrid },
  { path: "/cart", label: "购物车", icon: ShoppingCart },
  { path: "/profile", label: "我的", icon: User },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const totalItems = useCartStore((s) => s.totalItems());
  const { themeConfig } = useThemeRuntime();
  const navStyle = themeConfig.navStyle ?? "clean";
  const isFloating = navStyle === "floating";
  const isGlass = navStyle === "glass";
  const outerClass = isFloating
    ? "fixed bottom-0 left-0 right-0 z-bottom-nav bg-transparent pb-safe"
    : isGlass
      ? "fixed bottom-0 left-0 right-0 z-bottom-nav border-t border-[var(--theme-border)] bg-[color-mix(in_srgb,var(--theme-surface)_58%,transparent)] backdrop-blur-xl pb-safe"
      : "fixed bottom-0 left-0 right-0 z-bottom-nav border-t border-[var(--theme-border)] bg-[var(--theme-bg)]/95 backdrop-blur-md pb-safe";
  const navShellClass = isFloating
    ? "mx-auto mb-2 max-w-lg rounded-2xl border border-[var(--theme-border)] bg-[var(--theme-surface)]/96 shadow-[var(--theme-shadow)]"
    : isGlass
      ? "mx-auto max-w-lg"
      : "mx-auto max-w-lg";

  return (
    <nav className={outerClass} style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0.5rem)" }}>
      <div className={navShellClass}>
        <div className="flex items-center justify-around">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <SquishButton
                key={tab.path}
                type="button"
                variant="ghost"
                onClick={() => navigate(tab.path)}
                className="relative flex flex-col items-center gap-1 rounded-none bg-transparent px-5 py-3 touch-target !min-h-0"
              >
                <div className="relative">
                  <tab.icon
                    size={22}
                    className={isActive ? "text-[var(--theme-primary)]" : "text-[var(--theme-text-muted)]"}
                    strokeWidth={isActive ? 2.5 : 1.8}
                  />
                  {tab.path === "/cart" && totalItems > 0 && (
                    <motion.span
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-[var(--theme-danger)] px-1 text-[10px] font-bold text-white"
                    >
                      {totalItems > 99 ? "99+" : totalItems}
                    </motion.span>
                  )}
                </div>
                <span
                  className={`text-[11px] leading-tight ${isActive ? "font-semibold text-[var(--theme-primary)]" : "text-[var(--theme-text-muted)]"}`}
                >
                  {tab.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="activeTab"
                    className="absolute top-0 h-[2px] w-8 rounded-full bg-[var(--theme-primary)]"
                  />
                )}
              </SquishButton>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

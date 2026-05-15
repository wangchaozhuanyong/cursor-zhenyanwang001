import { Home, LayoutGrid, ShoppingCart, Sparkles, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useCartStore } from "@/stores/useCartStore";
import { SquishButton } from "@/modules/micro-interactions";
import { isLoggedIn } from "@/utils/token";

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
  const totalItems = useCartStore((s) => s.totalItems());

  if (location.pathname.startsWith("/checkout")) return null;

  const requiresAuth = (path: string) => path === "/cart" || path === "/profile";
  const handleNavigate = (path: string) => {
    if (requiresAuth(path) && !isLoggedIn()) {
      navigate("/login", { state: { from: path } });
      return;
    }
    navigate(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-bottom-nav border-t border-[var(--theme-border)] bg-[var(--theme-surface)] shadow-[0_-8px_24px_rgba(0,0,0,0.08)]"
      style={{ paddingBottom: "max(env(safe-area-inset-bottom), 0px)" }}
    >
      <div className="mx-auto max-w-lg">
        <div className="grid h-[68px] grid-cols-5 items-center px-1">
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.path;
            return (
              <SquishButton
                key={tab.path}
                type="button"
                variant="ghost"
                onClick={() => handleNavigate(tab.path)}
                className="relative flex flex-col items-center justify-center gap-1 bg-transparent px-1 py-2 touch-target !min-h-0"
              >
                <div
                  className={`relative flex h-8 min-w-8 items-center justify-center rounded-full px-2 ${
                    isActive
                      ? "bg-[color-mix(in_srgb,var(--theme-primary)_14%,var(--theme-surface))]"
                      : "bg-transparent"
                  }`}
                >
                  <tab.icon
                    size={20}
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
                  className={`text-[11px] leading-tight ${
                    isActive
                      ? "font-bold text-[var(--theme-primary)]"
                      : "font-medium text-[var(--theme-text-muted)]"
                  }`}
                >
                  {tab.label}
                </span>
              </SquishButton>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

import { Home, LayoutGrid, ShoppingCart, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useCartStore } from "@/stores/useCartStore";
import { motion } from "framer-motion";

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

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border bg-background/95 backdrop-blur-md pb-safe" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.5rem)' }}>
      <div className="mx-auto flex max-w-lg items-center justify-around">
        {tabs.map((tab) => {
          const isActive = location.pathname === tab.path;
          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="relative flex flex-col items-center gap-1 px-5 py-3 touch-target"
            >
              <div className="relative">
                <tab.icon
                  size={24}
                  className={isActive ? "text-gold" : "text-muted-foreground"}
                  strokeWidth={isActive ? 2.5 : 1.5}
                />
                {tab.path === "/cart" && totalItems > 0 && (
                  <motion.span
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -right-2.5 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-gold px-1 text-[10px] font-bold text-primary-foreground"
                  >
                    {totalItems > 99 ? "99+" : totalItems}
                  </motion.span>
                )}
              </div>
              <span
                className={`text-[11px] leading-tight ${isActive ? "font-semibold text-gold" : "text-muted-foreground"}`}
              >
                {tab.label}
              </span>
              {isActive && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute top-0 h-[2px] w-8 rounded-full bg-gold"
                />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

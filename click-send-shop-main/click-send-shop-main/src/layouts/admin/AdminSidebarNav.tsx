import { useCallback, useEffect, useState, type MouseEvent } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BarChart3, ChevronRight, LogOut, X } from "lucide-react";
import AdminSiteLogo from "@/components/admin/AdminSiteLogo";
import type { ResolvedNavChild, ResolvedNavItem } from "./adminNavConfig";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

/**
 * 侧栏滚动策略：
 * - inline：桌面端 sticky 满高侧栏，菜单区内部滚动，退出固定在底部（避免侧栏下方留白不跟滚）
 * - overlay：固定高度抽屉内自滚动（移动端全屏菜单，避免菜单溢出屏幕）
 */
function AdminSidebarNav({
  navItems,
  pathname,
  onNavigate,
  onPreload,
  onLogout,
  onClose,
  loggingOut = false,
  scrollMode,
  layoutTitle,
  logoutLabel,
  closeLabel,
}: {
  navItems: ResolvedNavItem[];
  pathname: string;
  onNavigate: (path: string) => void;
  onPreload?: (path: string) => void;
  onLogout: () => void;
  onClose?: () => void;
  loggingOut?: boolean;
  scrollMode: "inline" | "overlay";
  layoutTitle: string;
  logoutLabel: string;
  closeLabel?: string;
}) {
  const [expandedPath, setExpandedPath] = useState<string | null>(null);
  const childMatchesPath = useCallback((child: ResolvedNavChild, currentPath: string): boolean => {
    const ownPath = child.path ? currentPath === child.path || currentPath.startsWith(child.path) : false;
    return ownPath || Boolean(child.children?.some((nested) => childMatchesPath(nested, currentPath)));
  }, []);
  const preloadPath = useCallback((path?: string) => {
    if (path) onPreload?.(path);
  }, [onPreload]);

  useEffect(() => {
    const activeGroup = navItems.find((item) => {
      if (!item.children?.length) return false;
      const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
      const childActive = item.children.some((c) => childMatchesPath(c, pathname));
      return active || childActive;
    });
    if (activeGroup) setExpandedPath(activeGroup.path);
  }, [childMatchesPath, navItems, pathname]);

  const listClassName =
    scrollMode === "overlay"
      ? "min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-3"
      : "min-h-0 flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-2 py-3";

  return (
    <nav
      className={`flex touch-manipulation flex-col ${
        scrollMode === "overlay" ? "h-full max-h-[100dvh] min-h-0 flex-1" : "h-full min-h-0"
      }`}
    >
      <div className="admin-sidebar-brand safe-area-pt flex h-[var(--admin-chrome-toolbar-h)] min-h-[var(--admin-chrome-toolbar-h)] shrink-0 items-center gap-2 border-b border-border px-5">
        <AdminSiteLogo size="sm" />
        <span className="min-w-0 flex-1 truncate font-display text-lg font-bold text-foreground">{layoutTitle}</span>
        {scrollMode === "overlay" && onClose ? (
          <UnifiedButton
            type="button"
            aria-label={closeLabel ?? "关闭菜单"}
            onClick={onClose}
            className="touch-manipulation flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground active:bg-secondary/80"
          >
            <X size={20} />
          </UnifiedButton>
        ) : null}
      </div>

      <div className={listClassName}>
        {navItems.map((item) => {
          const active = pathname === item.path || (item.path !== "/admin" && pathname.startsWith(item.path));
          const childActive = item.children?.some((c) => childMatchesPath(c, pathname));
          const isExpanded = expandedPath === item.path;
          return (
            <div key={item.path}>
              <UnifiedButton
                type="button"
                onPointerEnter={() => preloadPath(item.path)}
                onPointerDown={() => preloadPath(item.path)}
                onFocus={() => preloadPath(item.path)}
                onClick={() => {
                  if (item.children?.length) {
                    setExpandedPath(item.path);
                    if (pathname !== item.path) {
                      onNavigate(item.path);
                    }
                    return;
                  }
                  onNavigate(item.path);
                }}
                className={`flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] transition-colors active:bg-secondary/80 ${
                  active || childActive
                    ? "bg-[var(--theme-primary)] font-semibold text-[var(--theme-primary-foreground)]"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon size={20} strokeWidth={2} />
                <span className="flex-1 text-left">{item.label}</span>
                {item.children && <ChevronRight size={18} className={`shrink-0 transition-transform ${isExpanded ? "rotate-90" : ""}`} />}
              </UnifiedButton>
              <AnimatePresence initial={false}>
                {item.children && isExpanded ? (
                <motion.div
                  layout
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                  className="relative z-0 ml-4 mt-0.5 overflow-hidden space-y-0.5 border-l border-border pl-3"
                >
                  {item.children.map((child) => {
                    const cActive = childMatchesPath(child, pathname);
                    const ChildIcon = child.icon ?? BarChart3;
                    if (child.children?.length) {
                      return (
                        <div key={child.path ?? child.label} className="space-y-0.5">
                          <div className="mt-2 flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-semibold text-[var(--theme-text-muted)]">
                            <ChildIcon size={14} />
                            <span>{child.label}</span>
                          </div>
                          <div className="space-y-0.5 pl-4">
                            {child.children.map((nested) => {
                              const nestedActive = childMatchesPath(nested, pathname);
                              const NestedIcon = nested.icon ?? BarChart3;
                              return (
                                <UnifiedButton
                                  type="button"
                                  key={nested.path ?? nested.label}
                                  onPointerEnter={() => preloadPath(nested.path)}
                                  onPointerDown={() => preloadPath(nested.path)}
                                  onFocus={() => preloadPath(nested.path)}
                                  onClick={() => nested.path && onNavigate(nested.path)}
                                  className={`flex min-h-[40px] w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors active:bg-secondary/80 ${
                                    nestedActive ? "font-semibold text-[var(--theme-primary)]" : "text-muted-foreground hover:text-foreground"
                                  }`}
                                >
                                  <NestedIcon size={16} />
                                  {nested.label}
                                </UnifiedButton>
                              );
                            })}
                          </div>
                        </div>
                      );
                    }
                    return (
                      <UnifiedButton
                        type="button"
                        key={child.path ?? child.label}
                        onPointerEnter={() => preloadPath(child.path)}
                        onPointerDown={() => preloadPath(child.path)}
                        onFocus={() => preloadPath(child.path)}
                        onClick={() => child.path && onNavigate(child.path)}
                        className={`flex min-h-[44px] w-full items-center gap-2 rounded-lg px-2.5 py-2.5 text-sm transition-colors active:bg-secondary/80 ${
                          cActive ? "font-semibold text-[var(--theme-primary)]" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <ChildIcon size={18} />
                        {child.label}
                      </UnifiedButton>
                    );
                  })}
                </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      <div className="safe-area-pb shrink-0 border-t border-border px-2 py-3">
        <UnifiedButton
          type="button"
          onClick={onLogout}
          disabled={loggingOut}
          className="flex min-h-[48px] w-full items-center gap-3 rounded-xl px-3 py-3 text-[15px] text-muted-foreground hover:bg-secondary active:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50"
        >
          <LogOut size={20} />
          {logoutLabel}
        </UnifiedButton>
      </div>
    </nav>
  );
}

export function AdminNavTab({
  icon: Icon,
  label,
  active,
  onPreload,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  active: boolean;
  onPreload?: () => void;
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <UnifiedButton
      type="button"
      onPointerEnter={onPreload}
      onPointerDown={onPreload}
      onFocus={onPreload}
      onClick={onClick}
      className={`touch-manipulation flex min-h-[52px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 active:opacity-80 ${
        active ? "text-[var(--theme-primary)]" : "text-muted-foreground"
      }`}
    >
      <Icon size={22} strokeWidth={active ? 2.25 : 2} className="shrink-0" />
      <span className="max-w-full truncate text-[10px] font-medium leading-tight">{label}</span>
    </UnifiedButton>
  );
}

export default AdminSidebarNav;

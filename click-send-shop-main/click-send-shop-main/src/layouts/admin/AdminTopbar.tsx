import { useCallback, useState } from "react";
import { Search, Menu } from "lucide-react";
import { toast } from "sonner";
import AdminEventBell from "@/modules/admin/components/AdminEventBell";
import { AdminOrderVoiceToolbar } from "@/modules/admin/components/AdminOrderVoiceNotifier";
import { useAdminT } from "@/hooks/useAdminT";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";
import type { ResolvedNavChild, ResolvedNavItem } from "./adminNavConfig";
import AdminAccountMenu from "./AdminAccountMenu";
import AdminSecurityAlertsButton from "./AdminSecurityAlertsButton";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type AdminTopbarProps = {
  navItems: ResolvedNavItem[];
  showNotificationsTab: boolean;
  canViewSecurityAlerts: boolean;
  canUseOrderVoice: boolean;
  loggingOut: boolean;
  onLogout: () => void;
  onOpenMobileSidebar: (trigger?: HTMLElement | null) => void;
};

export default function AdminTopbar({
  navItems,
  showNotificationsTab,
  canViewSecurityAlerts,
  canUseOrderVoice,
  loggingOut,
  onLogout,
  onOpenMobileSidebar,
}: AdminTopbarProps) {
  const adminNavigate = useAdminNavigation();
  const { t, tText } = useAdminT();
  const [topSearch, setTopSearch] = useState("");
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  const handleTopSearch = useCallback(() => {
    const q = topSearch.trim();
    if (!q) return;
    const lq = q.toLowerCase();
    const findChild = (children?: ResolvedNavChild[]): ResolvedNavChild | undefined => {
      for (const child of children ?? []) {
        if (child.label.toLowerCase().includes(lq)) return child;
        const nested = findChild(child.children);
        if (nested) return nested;
      }
      return undefined;
    };
    const match = navItems.find((n) => n.label.toLowerCase().includes(lq) || findChild(n.children));
    if (match) {
      const child = findChild(match.children);
      void adminNavigate(child?.path ?? match.path);
    } else {
      toast.error(tText("没有找到匹配的后台菜单。"));
    }
    setTopSearch("");
  }, [adminNavigate, navItems, tText, topSearch]);

  return (
    <>
      <div className="admin-chrome-toolbar flex h-[var(--admin-chrome-toolbar-h)] min-h-[var(--admin-chrome-toolbar-h)] items-center gap-1.5 px-[var(--admin-mobile-page-x)] sm:px-4 lg:px-5">
        <UnifiedButton
          type="button"
          aria-label={t("layout.openMenu")}
          className="touch-manipulation flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-foreground hover:bg-secondary lg:hidden"
          onClick={(event) => onOpenMobileSidebar(event.currentTarget)}
        >
          <Menu size={20} />
        </UnifiedButton>
        <div className="min-w-0 flex-1" aria-hidden />
        <div className="admin-topbar-actions flex shrink-0 flex-nowrap items-center gap-1 sm:gap-1.5">
          <UnifiedButton
            type="button"
            aria-label={t("layout.searchMenu")}
            className="touch-manipulation flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary md:hidden"
            onClick={() => setMobileSearchOpen((v) => !v)}
          >
            <Search size={18} />
          </UnifiedButton>
          <div className="admin-topbar-search hidden h-9 items-center gap-2 rounded-xl bg-secondary px-2.5 md:flex">
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <input
              placeholder={t("layout.searchMenu")}
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleTopSearch()}
              className="h-8 w-32 bg-transparent text-[13px] text-foreground outline-none placeholder:text-muted-foreground lg:w-36"
            />
          </div>
          <AdminEventBell />
          <AdminSecurityAlertsButton
            showNotificationsTab={showNotificationsTab}
            canViewSecurityAlerts={canViewSecurityAlerts}
          />
          {canUseOrderVoice ? <AdminOrderVoiceToolbar /> : null}
          <AdminAccountMenu
            canUseOrderVoice={canUseOrderVoice}
            loggingOut={loggingOut}
            onLogout={onLogout}
          />
        </div>
      </div>

      {mobileSearchOpen ? (
        <div className="admin-topbar-mobile-search border-t border-[var(--theme-border)] px-3 py-2 md:hidden">
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2">
            <Search size={16} className="shrink-0 text-muted-foreground" />
            <input
              placeholder={t("layout.searchMenu")}
              value={topSearch}
              onChange={(e) => setTopSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleTopSearch();
                  setMobileSearchOpen(false);
                }
              }}
              className="min-h-[36px] flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}

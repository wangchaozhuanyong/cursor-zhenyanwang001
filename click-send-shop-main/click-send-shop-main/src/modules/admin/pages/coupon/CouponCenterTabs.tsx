import { ClipboardList, Ticket } from "lucide-react";
import { useLocation } from "react-router-dom";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useAdminTOptional } from "@/hooks/useAdminT";
import { useAdminNavigation } from "@/hooks/useAdminNavigation";

const TABS = [
  {
    key: "vouchers",
    path: "/admin/marketing/coupons",
    zh: "优惠券模板",
    en: "Coupon templates",
    icon: Ticket,
  },
  {
    key: "records",
    path: "/admin/marketing/coupons/records",
    zh: "用户券记录",
    en: "User coupon records",
    icon: ClipboardList,
  },
] as const;

function isActiveTab(pathname: string, tabPath: string) {
  if (tabPath === "/admin/marketing/coupons") {
    return (
      pathname === tabPath
      || pathname === `${tabPath}/`
      || (/^\/admin\/marketing\/coupons\/[^/]+$/.test(pathname) && pathname !== "/admin/marketing/coupons/records")
    );
  }
  return pathname === tabPath || pathname.startsWith(`${tabPath}/`);
}

export default function CouponCenterTabs() {
  const adminNavigate = useAdminNavigation();
  const { pathname } = useLocation();
  const { locale } = useAdminTOptional();
  const isEn = locale === "en";

  return (
    <div className="flex min-w-0 flex-wrap gap-1 rounded-lg border border-border bg-card p-1">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        const active = isActiveTab(pathname, tab.path);
        return (
          <UnifiedButton
            key={tab.key}
            type="button"
            onClick={() => { void adminNavigate(tab.path); }}
            className={`min-h-[40px] flex-1 justify-center gap-2 rounded-md px-3 py-2 text-sm sm:flex-none ${
              active ? "bg-[color-mix(in_srgb,var(--theme-price)_15%,var(--theme-surface))] font-semibold text-theme-price" : "text-muted-foreground hover:bg-secondary hover:text-foreground"
            }`}
          >
            <Icon size={16} />
            {isEn ? tab.en : tab.zh}
          </UnifiedButton>
        );
      })}
    </div>
  );
}

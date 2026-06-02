import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { STORE_ACCOUNT_NAV_ITEMS } from "@/constants/storeAccountNav";
import { useSiteCapabilities } from "@/hooks/useSiteCapabilities";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { isLoyaltyFeatureEnabled } from "@/utils/loyaltyFeatureVisibility";
import { isLoggedIn } from "@/utils/token";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

function isNavActive(pathname: string, path: string): boolean {
  const base = path.split("?")[0];
  if (base === "/profile") return pathname === "/profile";
  if (base === "/orders") return pathname === "/orders" || pathname.startsWith("/orders/");
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function StoreAccountNav({ className }: { className?: string }) {
  const navigate = useNavigate();
  const location = useLocation();
  const capabilities = useSiteCapabilities();
  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();
  const loggedIn = isLoggedIn();

  const items = STORE_ACCOUNT_NAV_ITEMS.filter((item) => {
    if (item.capability === "points") {
      if (!capabilities.pointsEnabled) return false;
      if (!loyaltyLoading && loyaltyConfig && !isLoyaltyFeatureEnabled("points", capabilities, loyaltyConfig)) {
        return false;
      }
    }
    if (item.capability === "invite" && !capabilities.inviteEnabled) return false;
    return true;
  });

  const go = (path: string, requireAuth?: boolean) => {
    if (requireAuth && !loggedIn) {
      navigate("/login", { state: { from: path } });
      return;
    }
    navigate(path);
  };

  return (
    <nav className={cn("space-y-1", className)} aria-label="账户导航">
      {items.map((item) => {
        const active = isNavActive(location.pathname, item.path);
        return (
          <UnifiedButton
            key={item.path}
            type="button"
            onClick={() => go(item.path, item.requireAuth)}
            className={cn(
              "flex w-full items-center rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active
                ? "bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]"
                : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]",
            )}
          >
            {item.label}
          </UnifiedButton>
        );
      })}
      {!loggedIn ? (
        <UnifiedButton
          type="button"
          onClick={() => navigate("/login", { state: { from: "/profile" } })}
          className="mt-2 w-full rounded-xl bg-[var(--theme-primary)] py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)]"
        >
          登录 / 注册
        </UnifiedButton>
      ) : null}
    </nav>
  );
}

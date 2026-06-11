import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buildAccountFeaturesByKeys, type AccountFeatureKey } from "@/features/account/accountFeatureRegistry";
import { useStoreNavigationGuard } from "@/features/navigation/useStoreNavigationGuard";
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
  const { capabilities, loyaltyConfig, navigateFeature } = useStoreNavigationGuard();
  const loggedIn = isLoggedIn();

  const navKeys: AccountFeatureKey[] = [
    "profile",
    "orders",
    "returns",
    "address",
    "coupons",
    "points",
    "favorites",
    "history",
    "notifications",
    "feedback",
    "settings",
  ];
  const items = buildAccountFeaturesByKeys(navKeys, { capabilities, loyaltyConfig }, "desktop");

  return (
    <nav className={cn("space-y-1", className)} aria-label="账户导航">
      {items.map((item) => {
        const active = isNavActive(location.pathname, item.path);
        return (
          <UnifiedButton
            key={item.path}
            type="button"
            data-feature-key={item.key}
            aria-disabled={false}
            onClick={() => navigateFeature(item.key)}
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

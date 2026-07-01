import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { buildAccountFeaturesByKeys, type AccountFeatureKey } from "@/features/account/accountFeatureRegistry";
import { useStoreNavigationGuard } from "@/features/navigation/useStoreNavigationGuard";
import { isLoggedIn } from "@/utils/token";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { stripPublicLocaleFromPathname, usePublicLocale } from "@/i18n/publicLocale";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

function isNavActive(pathname: string, path: string): boolean {
  const base = path.split("?")[0];
  if (base === "/profile") return pathname === "/profile";
  if (base === "/orders") return pathname === "/orders" || pathname.startsWith("/orders/");
  return pathname === base || pathname.startsWith(`${base}/`);
}

export default function StoreAccountNav({ className }: { className?: string }) {
  const navigate = useStorefrontNavigate();
  const location = useLocation();
  const { localizedPath, t } = usePublicLocale();
  const { capabilities, loyaltyConfig, navigateFeature } = useStoreNavigationGuard();
  const loggedIn = isLoggedIn();
  const currentPathname = stripPublicLocaleFromPathname(location.pathname);

  const navKeys: AccountFeatureKey[] = [
    "profile",
    "orders",
    "returns",
    "address",
    "coupons",
    "wallet",
    "points",
    "rewards",
    "invite",
    "favorites",
    "history",
    "notifications",
    "feedback",
    "support",
    "settings",
  ];
  const items = buildAccountFeaturesByKeys(navKeys, { capabilities, loyaltyConfig }, "desktop");

  return (
    <nav className={cn("space-y-1", className)} aria-label="账户导航">
      {items.map((item) => {
        const active = isNavActive(currentPathname, item.path);
        const Icon = item.icon;
        return (
          <UnifiedButton
            key={item.path}
            type="button"
            data-feature-key={item.key}
            aria-disabled={false}
            onClick={() => navigateFeature(item.key)}
            className={cn(
              "flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-colors",
              active
                ? "bg-[color-mix(in_srgb,var(--theme-primary)_12%,var(--theme-surface))] text-[var(--theme-primary)]"
                : "text-[var(--theme-text-muted)] hover:bg-[var(--theme-bg)] hover:text-[var(--theme-text)]",
            )}
          >
            <Icon size={16} aria-hidden className="shrink-0" />
            <span className="min-w-0 flex-1 truncate">{item.label}</span>
            {item.badgeText ? (
              <span className="inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-[var(--theme-price)] px-1.5 text-[10px] font-black leading-none text-[var(--theme-price-foreground)]">
                {item.badgeText}
              </span>
            ) : null}
          </UnifiedButton>
        );
      })}
      {!loggedIn ? (
        <UnifiedButton
          type="button"
          onClick={() => navigate(localizedPath("/login"), { state: { from: localizedPath("/profile") } })}
          className="mt-2 w-full rounded-xl bg-[var(--theme-primary)] py-2.5 text-sm font-semibold text-[var(--theme-primary-foreground)]"
        >
          {t("common.loginRegister")}
        </UnifiedButton>
      ) : null}
    </nav>
  );
}

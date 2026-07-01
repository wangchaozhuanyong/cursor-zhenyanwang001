import { useCallback } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import {
  getAccountFeature,
  isAccountFeatureEnabled,
  resolveAccountFeaturePath,
  type AccountFeatureContext,
  type AccountFeatureKey,
} from "@/features/account/accountFeatureRegistry";
import { useSiteCapabilities, useSiteCapabilitiesReady } from "@/hooks/useSiteCapabilities";
import { useLoyaltyVisibility } from "@/hooks/useLoyaltyVisibility";
import { useAuthStore } from "@/stores/useAuthStore";
import { preloadStoreRoute } from "@/utils/storeRoutePreload";
import { usePublicLocale } from "@/i18n/publicLocale";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

export function useStoreNavigationGuard() {
  const navigate = useStorefrontNavigate();
  const location = useLocation();
  const capabilities = useSiteCapabilities();
  const capabilitiesReady = useSiteCapabilitiesReady();
  const { localizedPath } = usePublicLocale();
  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const navigateStorePath = useCallback((
    path: string,
    options: {
      requireAuth?: boolean;
      disabled?: boolean;
      disabledReason?: string;
      from?: string;
      state?: Record<string, unknown>;
    } = {},
  ) => {
    const from = options.from || `${location.pathname}${location.search}`;
    const target = localizedPath(path);
    if (options.requireAuth && !authHydrated) {
      toast.info("登录状态同步中，请稍后再试");
      return false;
    }
    if (options.requireAuth && !isAuthenticated) {
      navigate(localizedPath("/login"), { state: { from: target, fromState: options.state } });
      return false;
    }
    if (options.disabled) {
      toast.info(options.disabledReason || "功能暂未开放");
      return false;
    }
    void preloadStoreRoute(path).catch(() => {});
    navigate(target, { state: { from: localizedPath(from), ...(options.state || {}) } });
    return true;
  }, [authHydrated, isAuthenticated, localizedPath, location.pathname, location.search, navigate]);

  const navigateFeature = useCallback((featureKey: AccountFeatureKey) => {
    const feature = getAccountFeature(featureKey);
    if (!feature) {
      toast.info("功能暂未开放");
      return false;
    }
    const ctx: AccountFeatureContext = { capabilities, loyaltyConfig };
    const waitingForFeatureConfig =
      (Boolean(feature.capability) && !capabilitiesReady) ||
      (Boolean(feature.loyaltyFeature) && loyaltyLoading);
    if (waitingForFeatureConfig) {
      return navigateStorePath(resolveAccountFeaturePath(feature, ctx), {
        requireAuth: feature.requireAuth,
        from: "/profile",
      });
    }
    const enabled = isAccountFeatureEnabled(feature, ctx);
    return navigateStorePath(resolveAccountFeaturePath(feature, ctx), {
      requireAuth: feature.requireAuth,
      disabled: !enabled,
      disabledReason: feature.disabledReason,
      from: "/profile",
    });
  }, [capabilities, capabilitiesReady, loyaltyConfig, loyaltyLoading, navigateStorePath]);

  return {
    capabilities,
    capabilitiesReady,
    loyaltyConfig,
    loyaltyLoading,
    navigateFeature,
    navigateStorePath,
  };
}

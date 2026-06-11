import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
import { isLoggedIn } from "@/utils/token";
import { preloadStoreRoute } from "@/utils/storeRoutePreload";

export function useStoreNavigationGuard() {
  const navigate = useNavigate();
  const location = useLocation();
  const capabilities = useSiteCapabilities();
  const capabilitiesReady = useSiteCapabilitiesReady();
  const { config: loyaltyConfig, loading: loyaltyLoading } = useLoyaltyVisibility();

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
    if (options.requireAuth && !isLoggedIn()) {
      navigate("/login", { state: { from: path, fromState: options.state } });
      return false;
    }
    if (options.disabled) {
      toast.info(options.disabledReason || "功能暂未开放");
      return false;
    }
    void preloadStoreRoute(path).catch(() => {});
    navigate(path, { state: { from, ...(options.state || {}) } });
    return true;
  }, [location.pathname, location.search, navigate]);

  const navigateFeature = useCallback((featureKey: AccountFeatureKey) => {
    const feature = getAccountFeature(featureKey);
    if (!feature) {
      toast.info("功能暂未开放");
      return false;
    }
    const ctx: AccountFeatureContext = { capabilities, loyaltyConfig };
    const waitingForFeatureConfig = !capabilitiesReady || (feature.loyaltyFeature && loyaltyLoading);
    if (waitingForFeatureConfig) {
      toast.info("功能配置加载中，请稍后再试");
      return false;
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

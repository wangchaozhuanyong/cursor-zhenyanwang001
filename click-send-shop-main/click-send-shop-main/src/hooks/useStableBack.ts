import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import {
  buildLocationPath,
  getCurrentHistoryIndex,
  getNavigationPathAt,
  isSafeInternalPath,
  isSamePath,
} from "@/lib/navigationHistory";
import { isStorefrontMotionNavigationLocked } from "@/components/storefront-motion/useStorefrontMotionState";
import { readRouteBack } from "@/utils/routeBackState";

type BackLocationState = {
  from?: string;
  backTo?: string;
  returnTo?: string;
} | null;

type StableBackOptions = {
  fallbackPath: string;
  targetPath?: string;
};

function pickBackTarget(
  explicitTarget: string | undefined,
  state: BackLocationState,
  storedFrom: string | undefined,
  fallbackPath: string,
) {
  return explicitTarget ?? state?.backTo ?? state?.returnTo ?? state?.from ?? storedFrom ?? fallbackPath;
}

export function useStableBack({ fallbackPath, targetPath }: StableBackOptions) {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(() => {
    if (isStorefrontMotionNavigationLocked()) return;

    const currentPath = buildLocationPath(location);
    const state = location.state as BackLocationState;

    const index = getCurrentHistoryIndex();
    const previousPath = index > 0 ? getNavigationPathAt(index - 1) : undefined;
    const storedFrom = readRouteBack(location.key, currentPath);

    const target = pickBackTarget(targetPath, state, storedFrom, fallbackPath);
    const hasSafeTarget = isSafeInternalPath(target) && !isSamePath(target, currentPath);

    if (hasSafeTarget && isSamePath(previousPath, target)) {
      navigate(-1);
      return;
    }

    if (hasSafeTarget) {
      navigate(target, {
        replace: true,
        state: null,
      });
      return;
    }

    if (previousPath && !isSamePath(previousPath, currentPath)) {
      navigate(-1);
      return;
    }

    if (previousPath && isSamePath(previousPath, currentPath) && index > 1) {
      navigate(-2);
      return;
    }

    navigate(isSafeInternalPath(fallbackPath) ? fallbackPath : "/", {
      replace: true,
      state: null,
    });
  }, [fallbackPath, location, navigate, targetPath]);
}

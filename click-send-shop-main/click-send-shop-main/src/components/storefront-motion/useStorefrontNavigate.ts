import { startTransition, useCallback } from "react";
import {
  createPath,
  useNavigate,
  type NavigateFunction,
  type NavigateOptions,
  type To,
} from "react-router-dom";
import {
  beginStorefrontRouteTransition,
  failStorefrontRouteTransition,
  isStorefrontMotionNavigationLocked,
} from "./useStorefrontMotionState";
import { getStorefrontTransitionKind } from "./getStorefrontTransitionKind";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

function resolveStorefrontTarget(to: To) {
  if (typeof window === "undefined") return null;
  const rawPath = typeof to === "string" ? to : createPath(to);
  if (!rawPath || rawPath.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(rawPath)) {
    return null;
  }

  try {
    const url = new URL(rawPath, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function useStorefrontNavigate(): NavigateFunction {
  const navigate = useNavigate();

  return useCallback<NavigateFunction>((to: To | number, options?: NavigateOptions) => {
    if (typeof to === "number") {
      if (isStorefrontMotionNavigationLocked()) return;
      navigate(to);
      return;
    }

    const target = resolveStorefrontTarget(to);
    if (target && target !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
      beginStorefrontRouteTransition(target, getStorefrontTransitionKind(target));
    }

    try {
      startTransition(() => navigate(to, options));
    } catch (error) {
      failStorefrontRouteTransition(error instanceof Error ? error.message : "页面切换失败");
      throw error;
    }
  }, [navigate]);
}

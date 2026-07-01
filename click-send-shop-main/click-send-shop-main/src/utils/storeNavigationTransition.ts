import type { NavigateFunction, NavigateOptions, To } from "react-router-dom";
import { createPath } from "react-router-dom";
import {
  beginStorefrontRouteTransition,
  failStorefrontRouteTransition,
  isStorefrontMotionNavigationLocked,
} from "@/components/storefront-motion/useStorefrontMotionState";
import { getStorefrontTransitionKind } from "@/components/storefront-motion/getStorefrontTransitionKind";
import { rememberCurrentStoreScrollPosition } from "@/utils/storeScrollRestoration";

const NAVIGATION_HARD_FALLBACK_MS = 900;

export function navigateWithStoreTransition(
  navigate: NavigateFunction,
  to: To | number,
  options?: NavigateOptions,
) {
  rememberCurrentStoreScrollPosition();
  if (typeof to === "number") {
    if (isStorefrontMotionNavigationLocked()) return;
    navigate(to);
    return;
  }

  const fallbackTarget = resolveHardFallbackTarget(to);
  const beforePath = currentRoutePath();
  if (fallbackTarget && beforePath !== fallbackTarget.routePath) {
    beginStorefrontRouteTransition(fallbackTarget.routePath, getStorefrontTransitionKind(fallbackTarget.routePath));
  }

  try {
    navigate(to, options);
  } catch (error) {
    failStorefrontRouteTransition(error instanceof Error ? error.message : "页面切换失败");
    throw error;
  }

  if (!fallbackTarget || beforePath === fallbackTarget.routePath) return;

  window.setTimeout(() => {
    if (currentRoutePath() !== beforePath) return;
    window.location.assign(fallbackTarget.href);
  }, NAVIGATION_HARD_FALLBACK_MS);
}

function resolveHardFallbackTarget(to: To) {
  if (typeof window === "undefined") return null;

  const rawPath = typeof to === "string" ? to : createPath(to);
  if (!rawPath || rawPath.startsWith("#") || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(rawPath)) return null;

  try {
    const url = new URL(rawPath, window.location.href);
    if (url.origin !== window.location.origin) return null;
    return {
      href: `${url.pathname}${url.search}${url.hash}`,
      routePath: `${url.pathname}${url.search}${url.hash}`,
    };
  } catch {
    return null;
  }
}

function currentRoutePath() {
  if (typeof window === "undefined") return "";
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

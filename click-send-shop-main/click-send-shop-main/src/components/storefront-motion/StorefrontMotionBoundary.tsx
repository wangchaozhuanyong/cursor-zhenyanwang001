import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  beginStorefrontRouteTransition,
  commitStorefrontRouteTransition,
  initializeStorefrontMotionLocation,
  useStorefrontMotionState,
} from "./useStorefrontMotionState";
import {
  getStorefrontTransitionKind,
  isProtectiveStorefrontTransition,
} from "./getStorefrontTransitionKind";

export default function StorefrontMotionBoundary({ children }: { children: ReactNode }) {
  const location = useLocation();
  const motion = useStorefrontMotionState();
  const mountedRef = useRef(false);
  const boundaryRef = useRef<HTMLDivElement | null>(null);
  const routeKey = `${location.pathname}${location.search}${location.hash}`;
  const protective = isProtectiveStorefrontTransition(motion.transitionKind);
  const retained = motion.phase === "pending" && !protective;
  const protectedPending = motion.phase === "pending" && protective;
  const interactionLocked = retained || protectedPending;

  useEffect(() => {
    const handleLinkIntent = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) return;
      const target = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(target instanceof HTMLAnchorElement)) return;
      if (target.target && target.target !== "_self") return;
      if (target.hasAttribute("download")) return;

      let url: URL;
      try {
        url = new URL(target.href, window.location.href);
      } catch {
        return;
      }

      if (url.origin !== window.location.origin) return;
      const nextPath = `${url.pathname}${url.search}${url.hash}`;
      const currentPath = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const hashOnlyTarget = url.pathname === window.location.pathname && url.search === window.location.search;
      if (!nextPath || nextPath === currentPath || hashOnlyTarget) return;
      beginStorefrontRouteTransition(nextPath, getStorefrontTransitionKind(nextPath));
    };

    document.addEventListener("click", handleLinkIntent, { capture: true });
    return () => document.removeEventListener("click", handleLinkIntent, { capture: true });
  }, []);

  useLayoutEffect(() => {
    const path = `${location.pathname}${location.search}${location.hash}`;
    if (!mountedRef.current) {
      mountedRef.current = true;
      initializeStorefrontMotionLocation(path);
      return;
    }
    commitStorefrontRouteTransition(path, getStorefrontTransitionKind(location.pathname));
  }, [location.hash, location.pathname, location.search]);

  useLayoutEffect(() => {
    const node = boundaryRef.current;
    if (!node) return;
    const inertNode = node as HTMLDivElement & { inert?: boolean };
    if (interactionLocked) {
      inertNode.inert = true;
      node.setAttribute("inert", "");
      node.setAttribute("aria-hidden", "true");
      return;
    }

    inertNode.inert = false;
    node.removeAttribute("inert");
    node.removeAttribute("aria-hidden");
  }, [interactionLocked]);

  return (
    <div
      ref={boundaryRef}
      className={cn(
        "sf-motion-boundary",
        retained && "sf-motion-boundary--retained",
        protectedPending && "sf-motion-boundary--protected",
        motion.phase === "settling" && "sf-motion-boundary--settling",
      )}
      data-storefront-motion-phase={motion.phase}
      data-storefront-transition-kind={motion.transitionKind}
      data-storefront-route-key={routeKey}
    >
      {children}
    </div>
  );
}

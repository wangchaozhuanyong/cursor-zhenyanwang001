import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { startGlobalLoadingImmediate, stopGlobalLoading, subscribeGlobalLoading } from "@/lib/loadingProgress";

type BarState = { progress: number; visible: boolean; animatingOut: boolean };
type RouterLoadingLocation = ReturnType<typeof useLocation>;
type RouterLoadingBridgeProps = {
  getRouteKey?: (location: RouterLoadingLocation) => string | null;
};

const INITIAL_STATE: BarState = { progress: 0, visible: false, animatingOut: false };

function defaultRouteKey(location: RouterLoadingLocation) {
  return `${location.pathname}${location.search}`;
}

export function TopProgressBar() {
  const [state, setState] = useState<BarState>(INITIAL_STATE);

  useEffect(() => subscribeGlobalLoading(setState), []);

  if (!state.visible) return null;

  return (
    <div
      className={cn(
        "pointer-events-none fixed inset-x-0 top-0 z-[120] h-[2px]",
        state.animatingOut ? "opacity-0" : "opacity-100",
      )}
      style={{ transition: "opacity 260ms ease-in-out" }}
      aria-hidden="true"
    >
      <div
        className="h-full"
        style={{
          width: `${Math.min(state.progress * 100, 100)}%`,
          backgroundColor: "var(--theme-primary, hsl(var(--primary)))",
          transition: "width 220ms ease-in-out",
        }}
      />
    </div>
  );
}

export function RouterLoadingBridge({ getRouteKey = defaultRouteKey }: RouterLoadingBridgeProps = {}) {
  const location = useLocation();
  const routeKey = getRouteKey(location);
  const mountedRef = useRef(false);
  const tokenRef = useRef<symbol | null>(null);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    if (tokenRef.current) {
      stopGlobalLoading(tokenRef.current);
      tokenRef.current = null;
    }

    if (!routeKey) return;

    const token = startGlobalLoadingImmediate();
    tokenRef.current = token;
    let frameOne = 0;
    let frameTwo = 0;
    let finishTimer = 0;

    const finish = () => {
      if (tokenRef.current !== token) return;
      stopGlobalLoading(token);
      tokenRef.current = null;
    };

    frameOne = window.requestAnimationFrame(() => {
      frameTwo = window.requestAnimationFrame(() => {
        finishTimer = window.setTimeout(finish, 180);
      });
    });

    return () => {
      window.cancelAnimationFrame(frameOne);
      window.cancelAnimationFrame(frameTwo);
      window.clearTimeout(finishTimer);
    };
  }, [routeKey]);

  useEffect(() => () => {
    if (tokenRef.current) {
      stopGlobalLoading(tokenRef.current);
      tokenRef.current = null;
    }
  }, []);

  return null;
}

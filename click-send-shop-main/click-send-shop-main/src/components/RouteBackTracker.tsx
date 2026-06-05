import { useLayoutEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { buildRoutePath, readRouteBack, rememberRouteBack, resolveTrackedRouteBackSource } from "@/utils/routeBackState";

type PreviousRoute = {
  key: string;
  path: string;
};

export default function RouteBackTracker() {
  const location = useLocation();
  const previousRef = useRef<PreviousRoute | null>(null);
  const currentKey = location.key;
  const currentPath = buildRoutePath(location);

  useLayoutEffect(() => {
    const current = {
      key: currentKey,
      path: currentPath,
    };
    const previous = previousRef.current;

    if (previous && previous.path !== current.path) {
      const fromPath = resolveTrackedRouteBackSource({
        previousPath: previous.path,
        currentPath: current.path,
        previousStoredFrom: readRouteBack(previous.key, previous.path),
      });
      if (fromPath) {
        rememberRouteBack(current.key, fromPath, current.path);
      }
    }

    previousRef.current = current;
  }, [currentKey, currentPath]);

  return null;
}

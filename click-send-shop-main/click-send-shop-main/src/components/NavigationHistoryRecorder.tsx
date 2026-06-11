import { useEffect } from "react";
import { useLocation } from "react-router-dom";

import { buildLocationPath, recordNavigationPath } from "@/lib/navigationHistory";

export function NavigationHistoryRecorder() {
  const location = useLocation();

  useEffect(() => {
    recordNavigationPath(buildLocationPath(location));
  }, [location]);

  return null;
}

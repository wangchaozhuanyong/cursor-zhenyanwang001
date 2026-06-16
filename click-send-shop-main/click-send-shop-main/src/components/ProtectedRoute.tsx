import { Navigate, useLocation } from "react-router-dom";
import AppRouteFallback from "@/components/AppRouteFallback";
import { useAuthStore } from "@/stores/useAuthStore";
import { buildRoutePath, readRouteBack } from "@/utils/routeBackState";
import { usePublicLocale } from "@/i18n/publicLocale";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const { localizedPath } = usePublicLocale();

  if (!authHydrated) {
    return <AppRouteFallback />;
  }

  if (!isAuthenticated) {
    const currentPath = buildRoutePath(location);
    const cancelFrom = readRouteBack(location.key, currentPath);

    return (
      <Navigate
        to={localizedPath("/login")}
        state={{ from: currentPath, fromState: location.state, cancelFrom }}
        replace
      />
    );
  }

  return <>{children}</>;
}

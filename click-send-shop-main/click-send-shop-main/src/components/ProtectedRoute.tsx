import { Navigate, useLocation } from "react-router-dom";
import AppRouteFallback from "@/components/AppRouteFallback";
import { useAuthStore } from "@/stores/useAuthStore";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const authHydrated = useAuthStore((s) => s.authHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  if (!authHydrated) {
    return <AppRouteFallback />;
  }

  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{ from: `${location.pathname}${location.search}`, fromState: location.state }}
        replace
      />
    );
  }

  return <>{children}</>;
}

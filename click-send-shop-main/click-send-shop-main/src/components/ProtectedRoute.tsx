import { Navigate, useLocation } from "react-router-dom";
import { isLoggedIn } from "@/utils/token";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!isLoggedIn()) {
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

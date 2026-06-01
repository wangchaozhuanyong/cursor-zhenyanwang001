import { Navigate, useParams } from "react-router-dom";

/**
 * @deprecated Compatibility redirect for old /admin/dashboard bookmarks.
 * The current dashboard route is /admin.
 */
export function LegacyDashboardRedirect() {
  return <Navigate to="/admin" replace />;
}

/**
 * @deprecated Compatibility redirect for old /admin/coupons/:id links.
 * Keep until production access logs show no hits for at least 30 days.
 */
export function LegacyCouponRedirect() {
  const { id } = useParams<{ id: string }>();
  const target = id
    ? `/admin/marketing/coupons/${encodeURIComponent(id)}`
    : "/admin/marketing/coupons";
  return <Navigate to={target} replace />;
}

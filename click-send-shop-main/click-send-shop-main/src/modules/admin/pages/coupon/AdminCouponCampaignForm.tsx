import { Navigate, useLocation } from "react-router-dom";

export default function AdminCouponCampaignForm() {
  const location = useLocation();
  const target = location.pathname.endsWith("/new")
    ? "/admin/marketing/coupons/new"
    : "/admin/marketing/coupons";

  return <Navigate to={target} replace />;
}

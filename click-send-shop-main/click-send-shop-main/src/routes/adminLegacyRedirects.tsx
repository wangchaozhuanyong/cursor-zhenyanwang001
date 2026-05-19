import { Navigate, useParams } from "react-router-dom";

/** 旧路径 /admin/coupons/:id → 营销中心优惠券编辑 */
export function LegacyCouponRedirect() {
  const { id } = useParams<{ id: string }>();
  const target = id
    ? `/admin/marketing/coupons/${encodeURIComponent(id)}`
    : "/admin/marketing/coupons";
  return <Navigate to={target} replace />;
}

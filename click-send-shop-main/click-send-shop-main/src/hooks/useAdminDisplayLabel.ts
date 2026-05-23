import { useCallback, useMemo } from "react";
import { useAdminT } from "@/hooks/useAdminT";
import {
  labelActivityType,
  labelAdminLegacyRole,
  labelComplianceType,
  labelCouponRecordStatus,
  labelCouponStatus,
  labelCouponType,
  labelExportType,
  labelNotificationType,
  labelOrderPaymentMethod,
  labelPointsAction,
  labelRbacRoleCode,
  labelRecycleType,
  labelReturnType,
  labelRewardStatus,
} from "@/utils/adminDisplayLabels";

const CJK = /[\u4e00-\u9fff]/;

/** Localize adminDisplayLabels helpers when locale is English. */
export function useAdminDisplayLabel() {
  const { tText } = useAdminT();
  const L = useCallback(
    (zh: string) => (CJK.test(zh) ? tText(zh) : zh),
    [tText],
  );

  return useMemo(
    () => ({
      activityType: (type: string | undefined) => L(labelActivityType(type)),
      complianceType: (type: string | null | undefined) => L(labelComplianceType(type)),
      exportType: (type: string) => L(labelExportType(type)),
      recycleType: (type: string, typeLabel?: string | null) =>
        L(labelRecycleType(type, typeLabel)),
      rewardStatus: (status: string) => L(labelRewardStatus(status)),
      couponType: (type: string) => L(labelCouponType(type)),
      couponStatus: (status: string) => L(labelCouponStatus(status)),
      couponRecordStatus: (status: string) => L(labelCouponRecordStatus(status)),
      notificationType: (type: string) => L(labelNotificationType(type)),
      orderPaymentMethod: (method: string | null | undefined) =>
        L(labelOrderPaymentMethod(method)),
      checkoutPaymentMethod: (method: string | null | undefined) =>
        L(labelOrderPaymentMethod(method)),
      pointsAction: (action: string) => L(labelPointsAction(action)),
      adminLegacyRole: (role: string) => L(labelAdminLegacyRole(role)),
      rbacRoleCode: (code: string) => L(labelRbacRoleCode(code)),
      returnType: (type: string) => L(labelReturnType(type)),
      text: L,
    }),
    [L],
  );
}

import type { CouponStatus } from "@/types/coupon";
import type { ReturnStatus } from "@/types/return";
import type { RewardStatus } from "@/types/reward";
import type { NotificationType } from "@/types/notification";
import { RETURN_STATUS_META } from "@/constants/statusDictionary";

export const COUPON_STATUS_MAP: Record<CouponStatus, string> = {
  available: "可使用",
  used: "已使用",
  expired: "已过期",
};

export const RETURN_STATUS_MAP: Record<ReturnStatus, string> = Object.fromEntries(
  Object.entries(RETURN_STATUS_META).map(([key, value]) => [key, value.label]),
) as Record<ReturnStatus, string>;

export const REWARD_STATUS_MAP: Record<RewardStatus, string> = {
  pending: "待审核",
  approved: "已通过",
  rejected: "已拒绝",
  paid: "已打款",
};

export const NOTIFICATION_TYPE_MAP: Record<NotificationType, string> = {
  system: "系统通知",
  order: "订单通知",
  promotion: "促销通知",
  points: "积分通知",
};

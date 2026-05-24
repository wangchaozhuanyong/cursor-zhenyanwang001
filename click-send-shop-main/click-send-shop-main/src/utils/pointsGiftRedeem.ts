import type { PointsGiftCatalogItem } from "@/api/modules/points";

export function giftRedeemBlockReason(
  gift: PointsGiftCatalogItem,
  balance: number,
): string | null {
  if (balance < gift.required_points) return "积分不足";
  if (gift.remaining_stock != null && gift.remaining_stock <= 0) return "已兑完";
  return null;
}

export function giftRedeemCashHint(cashAmount: number, onlinePaymentEnabled: boolean): string | null {
  if (cashAmount <= 0) return null;
  if (onlinePaymentEnabled) return `兑换后需在线支付 RM ${cashAmount}`;
  return `兑换后需联系客服支付 RM ${cashAmount}`;
}

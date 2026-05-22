/** 买家端订单支付方式展示 */
export function labelOrderPaymentMethod(method?: string | null, orderType?: string | null): string {
  const m = String(method || "").trim();
  const type = String(orderType || "").trim();
  if (type === "points_gift" && m === "points_gift") return "纯积分兑换";
  if (type === "points_gift" && m === "points_plus_cash") return "积分+现金";
  if (m === "points_gift") return "积分兑换";
  if (m === "points_plus_cash") return "积分+现金";
  if (m === "online") return "在线支付";
  if (m === "whatsapp") return "WhatsApp / 客服";
  if (m === "reward_wallet") return "返现钱包";
  return m || "-";
}

export function isGiftOrder(orderType?: string | null): boolean {
  return String(orderType || "") === "points_gift";
}

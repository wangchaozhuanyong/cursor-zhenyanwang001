import type { OrderStatus } from "@/types/order";
import { ORDER_STATUS_META } from "@/constants/statusDictionary";

export const ORDER_STATUS_MAP: Record<OrderStatus, string> = Object.fromEntries(
  Object.entries(ORDER_STATUS_META).map(([key, value]) => [key, value.label]),
) as Record<OrderStatus, string>;

export const ORDER_STATUS_COLOR: Record<OrderStatus, string> = {
  pending: "text-yellow-600",
  paid: "text-blue-600",
  shipped: "text-purple-600",
  completed: "text-green-600",
  cancelled: "text-gray-400",
  refunding: "text-orange-600",
  refunded: "text-red-600",
};

import type { InventoryChangeType } from "@/types/inventory";

export const INVENTORY_PAGE_SIZE = 20;
export const INVENTORY_BATCH_MAX = 50;

export type InventoryTabKey =
  | "skus"
  | "smart"
  | "alerts"
  | "purchaseOrders"
  | "records"
  | "rules"
  | "conversions";

export type SmartViewKey = "overview" | "limits" | "suggestions" | "purchase" | "rules";

export const CHANGE_LABEL: Record<InventoryChangeType, string> = {
  in: "入库",
  out: "出库",
  adjust: "盘点调整",
  order_deduct: "订单扣减",
  order_release: "订单释放",
  unpack_parent_out: "拆包-大包装减少",
  unpack_child_in: "拆包-小包装增加",
  assemble_child_out: "组装-小包装减少",
  assemble_parent_in: "组装-大包装增加",
  auto_unpack_parent_out: "自动拆包-大包装减少",
  auto_unpack_child_in: "自动拆包-小包装增加",
};

export const CONVERSION_LABEL: Record<string, string> = {
  unpack: "手动拆包",
  assemble: "手动组装",
  auto_unpack: "自动拆包",
};

export const ALERT_STATUS_LABEL: Record<string, string> = {
  pending: "待补货",
  suggested: "已生成建议",
  ordered: "已下单",
  in_transit: "已补货待到货",
  partial_received: "部分到货",
  resolved: "已完成",
  cancelled: "已取消",
  overdue: "已延期",
  ignored: "已忽略",
  snoozed: "延后提醒",
};

export const PURCHASE_STATUS_LABEL: Record<string, string> = {
  draft: "草稿",
  ordered: "已下单",
  in_transit: "在途",
  partial_received: "部分到货",
  received: "已全部到货",
  cancelled: "已取消",
  overdue: "已延期",
};

export const INVENTORY_SKU_HEADS = [
  "图",
  "商品",
  "规格",
  "SKU 编码",
  "分类",
  "可用库存",
  "总库存",
  "单位",
  "预警值",
  "状态",
  "更新时间",
  "操作",
] as const;

export function validateAdjustQuantity(
  changeType: "in" | "out" | "adjust",
  qty: number,
  availableStock: number,
  tText: (zh: string) => string,
) {
  if (!Number.isInteger(qty)) throw new Error(tText("数量必须为整数"));
  if (changeType === "adjust" && qty < 0) throw new Error(tText("盘点后的库存必须大于等于 0"));
  if (changeType !== "adjust" && qty <= 0) throw new Error(tText("数量必须大于 0"));
  if (changeType === "out" && qty > availableStock) throw new Error(tText("出库数量不能超过当前可用库存"));
}

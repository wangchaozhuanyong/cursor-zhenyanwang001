import { labelChannelCode } from "@/utils/paymentAdminLabels";

export const UNKNOWN_LABEL = "未知";

export function labelFromMap(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback: string = UNKNOWN_LABEL,
): string {
  if (value == null || value === "") return "—";
  return map[value] ?? fallback;
}

export const REPORT_COLUMN_LABELS: Record<string, string> = {
  id: "编号",
  date: "日期",
  order_no: "订单号",
  user_id: "用户",
  product_id: "商品",
  amount: "金额",
  status: "状态",
  type: "类型",
  created_at: "创建时间",
  updated_at: "更新时间",
};

export function labelReportColumn(key: string): string {
  return REPORT_COLUMN_LABELS[key] ?? key;
}

export const STOCK_STATUS_LABELS: Record<string, string> = {
  low: "低库存",
  normal: "正常",
  out: "缺货",
};

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  flash_sale: "限时秒杀",
  full_reduction: "满减活动",
  coupon_activity: "优惠券活动",
  new_user_gift: "新人礼包",
  member_activity: "会员活动",
  points_bonus: "积分赠送",
  cashback_activity: "返现活动",
};

export function labelActivityType(type: string | undefined): string {
  if (!type) return "—";
  return ACTIVITY_TYPE_LABELS[type] || type;
}

export function labelReportCellValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "boolean") return value ? "是" : "否";
  const s = String(value);
  if (key === "stock_status") return labelFromMap(STOCK_STATUS_LABELS, s, s);
  if (key === "activity_type") return labelFromMap(ACTIVITY_TYPE_LABELS, s, s);
  if (key.endsWith("_rate") && !Number.isNaN(Number(s))) return `${s}%`;
  return s;
}

export const POINTS_ACTION_LABELS: Record<string, string> = {
  order: "订单奖励",
  order_earn: "订单奖励",
  order_reverse: "订单回滚",
  refund: "退款扣回",
  sign_in: "每日签到",
  daily_checkin: "每日签到",
  invite_reward: "邀请奖励",
  admin_add: "管理员增加",
  admin_deduct: "管理员扣减",
  admin_adjust: "管理员调整",
  redeem: "积分抵扣",
};
export function labelPointsAction(action: string): string {
  return labelFromMap(POINTS_ACTION_LABELS, action, "其他变动");
}

export const ADMIN_LEGACY_ROLE_LABELS: Record<string, string> = {
  super_admin: "超级管理员",
  admin: "管理员",
  admin_manager: "运营管理员",
  disabled: "已禁用",
  marketing: "营销",
  operator: "运营",
  viewer: "只读",
};
export function labelAdminLegacyRole(role: string): string {
  return labelFromMap(ADMIN_LEGACY_ROLE_LABELS, role, "其他角色");
}

export const RBAC_ROLE_CODE_LABELS: Record<string, string> = {
  super_admin: "超级管理员",
  admin_manager: "运营主管",
  marketing: "营销",
  finance: "财务",
  warehouse: "仓储",
  customer_service: "客服",
};
export function labelRbacRoleCode(code: string): string {
  return labelFromMap(RBAC_ROLE_CODE_LABELS, code, code);
}

export const RETURN_TYPE_LABELS: Record<string, string> = {
  refund: "仅退款",
  return: "退货退款",
  return_refund: "退货退款",
  exchange: "换货",
  repair: "维修",
};
export function labelReturnType(type: string): string {
  return labelFromMap(RETURN_TYPE_LABELS, type, "其他售后");
}

export const ORDER_PAYMENT_METHOD_LABELS: Record<string, string> = {
  online: "在线支付",
  whatsapp: "联系客服",
  offline: "线下支付",
  cod: "货到付款",
};
export const CHECKOUT_PAYMENT_METHOD_LABELS: Record<string, string> = {
  ...ORDER_PAYMENT_METHOD_LABELS,
  fpx: "FPX 网银",
  card: "银行卡",
  wallet: "电子钱包",
  stripe: "Stripe",
  stripe_checkout: "Stripe Checkout",
  manual_bank: "银行转账",
  reward_wallet: "返现钱包",
  tng_ewallet: "Touch 'n Go",
  grabpay: "GrabPay",
  boost: "Boost",
};
export function labelOrderPaymentMethod(method: string | null | undefined): string {
  if (!method) return "—";
  return CHECKOUT_PAYMENT_METHOD_LABELS[method] || labelChannelCode(method) || "其他方式";
}
export const labelCheckoutPaymentMethod = labelOrderPaymentMethod;

export const COUPON_TYPE_LABELS: Record<string, string> = {
  fixed: "满减券",
  percentage: "折扣券",
  shipping: "运费券",
};
export const COUPON_STATUS_LABELS: Record<string, string> = {
  available: "可用",
  expired: "已过期",
  disabled: "已停用",
};
export const COUPON_RECORD_STATUS_LABELS: Record<string, string> = {
  available: "未使用",
  used: "已使用",
  expired: "已过期",
};
export function labelCouponType(type: string): string {
  return labelFromMap(COUPON_TYPE_LABELS, type, "其他券种");
}
export function labelCouponStatus(status: string): string {
  return labelFromMap(COUPON_STATUS_LABELS, status, "其他状态");
}
export function labelCouponRecordStatus(status: string): string {
  return labelFromMap(COUPON_RECORD_STATUS_LABELS, status, "其他状态");
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  system: "系统通知",
  order: "订单通知",
  shipping: "物流通知",
  payment: "支付通知",
  refund: "退款通知",
  after_sale: "售后通知",
  promotion: "促销活动",
  coupon: "优惠券通知",
  points: "积分变动",
  reward: "奖励通知",
};
export function labelNotificationType(type: string): string {
  return labelFromMap(NOTIFICATION_TYPE_LABELS, type, "其他通知");
}

export const REWARD_STATUS_LABELS: Record<string, string> = {
  pending: "待处理",
  approved: "已入账",
  paid: "已提现",
  rejected: "已拒绝",
  reversed: "已冲正",
};
export function labelRewardStatus(status: string): string {
  return labelFromMap(REWARD_STATUS_LABELS, status, "其他状态");
}

export const EXPORT_TYPE_LABELS: Record<string, string> = {
  sales_daily: "销售日报",
  sales_monthly: "销售月报",
  product_analysis: "商品分析",
  category_analysis: "分类分析",
  order_analysis: "订单分析",
  customer_analysis: "客户分析",
  activity_analysis: "活动分析",
  coupon_analysis: "优惠券分析",
  inventory_analysis: "库存分析",
  search_analysis: "搜索分析",
  products: "商品数据",
  orders: "订单数据",
  users: "用户数据",
};
export function labelExportType(type: string): string {
  return labelFromMap(EXPORT_TYPE_LABELS, type, "其他导出");
}

export const RECYCLE_TYPE_LABELS: Record<string, string> = {
  products: "商品",
  categories: "分类",
  coupons: "优惠券",
  banners: "Banner",
  content_pages: "内容页",
  product_reviews: "评论",
};
export function labelRecycleType(type: string, typeLabel?: string | null): string {
  if (typeLabel?.trim()) return typeLabel.trim();
  return labelFromMap(RECYCLE_TYPE_LABELS, type, "其他");
}

export function formatUserDisplay(nickname?: string | null, phone?: string | null): string {
  const n = (nickname || "").trim();
  const p = (phone || "").trim();
  if (n && p) return `${n}（${p}）`;
  return n || p || "未知用户";
}

export function internalIdTitle(id: string | null | undefined, prefix = "内部编号"): string | undefined {
  if (!id) return undefined;
  return `${prefix}：${id}`;
}

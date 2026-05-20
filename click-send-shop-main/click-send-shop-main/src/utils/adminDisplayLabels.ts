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

/** 与 server/src/utils/reportColumnLabels.js 保持同步 */
export const REPORT_COLUMN_LABELS: Record<string, string> = {
  id: "编号",
  date: "日期",
  month: "月份",
  keyword: "关键词",
  category_id: "分类",
  coupon_id: "优惠券",
  activity_id: "活动",
  order_id: "订单",
  user_id: "用户",
  product_id: "商品",
  order_count: "订单数",
  paid_order_count: "支付订单数",
  cancelled_order_count: "取消订单数",
  refund_order_count: "退款订单数",
  unpaid_order_count: "未支付订单数",
  gross_sales: "销售额",
  discount_amount: "优惠金额",
  shipping_fee: "运费",
  refund_amount: "退款金额",
  net_sales: "净销售额",
  items_sold: "销售件数",
  user_count: "用户数",
  search_count: "搜索次数",
  no_result_count: "无结果次数",
  product_click_count: "商品点击数",
  add_to_cart_count: "加购量",
  issued_count: "发放数量",
  claimed_count: "领取数量",
  used_count: "使用数量",
  expired_count: "过期数量",
  active_users: "活跃用户",
  order_users: "下单用户",
  new_users: "新增用户",
  paying_users: "支付用户数",
  product_count: "商品数",
  active_product_count: "在售商品数",
  stock_qty: "库存总量",
  warning_stock: "预警库存",
  current_stock: "当前库存",
  average_order_value: "客单价",
  units_per_order: "每单件数",
  payment_rate: "支付率",
  refund_rate: "退款率",
  mom_growth_rate: "环比增长率",
  claim_rate: "领取率",
  use_rate: "使用率",
  roi: "投入产出比",
  paid_amount: "实收金额",
  pending_orders: "待处理订单",
  product_view_count: "商品浏览次数",
  checkout_start_count: "发起结算次数",
  sales_7d: "近7日销量",
  sales_30d: "近30日销量",
  avg_daily_sales: "日均销量",
  stock_status: "库存状态",
  activity_title: "活动名称",
  activity_type: "活动类型",
  coupon_title: "优惠券名称",
  start_at: "开始时间",
  end_at: "结束时间",
  product_name: "商品名称",
  cover_image: "封面图",
  category_name: "分类",
  category_path: "分类路径",
  parent_category_id: "父分类",
  parent_category_name: "父分类名称",
  sales_qty: "销量",
  sales_amount: "销售额",
  buyer_count: "购买用户",
  refund_qty: "退款件数",
  view_count: "浏览量",
  add_cart_count: "加购量",
  favorite_count: "收藏量",
  gross_profit: "毛利",
  gross_margin: "毛利率",
  available_stock_days: "可售天数",
  last_searched_at: "最后搜索时间",
  created_at: "创建时间",
  updated_at: "更新时间",
  conversion_rate: "转化率",
  status: "状态",
  type: "类型",
  provider: "支付网关",
  channel_code: "支付渠道",
  payment_method: "支付方式",
  payment_status: "支付状态",
  order_no: "订单号",
  nickname: "昵称",
  phone: "手机号",
  amount: "金额",
  currency: "币种",
  code: "编码",
  title: "标题",
  name: "名称",
  description: "说明",
  reason: "原因",
  remark: "备注",
  notes: "备注",
  total: "合计",
  count: "数量",
  qty: "数量",
  price: "价格",
  cost: "成本",
  fee: "手续费",
  rate: "比率",
  percent: "百分比",
  region: "区域",
  source: "来源",
  module: "模块",
  action: "操作类型",
  event_type: "事件类型",
  verify_status: "验签状态",
  processing_result: "处理结果",
  reconcile_date: "对账日期",
  success_amount: "成功金额",
  diff_amount: "差异金额",
  order_count_recon: "笔数",
};

const REPORT_TOKEN_LABELS: Record<string, string> = {
  units: "件数",
  per: "每",
  order: "订单",
  rate: "率",
  sales: "销售",
  stock: "库存",
  status: "状态",
  type: "类型",
  activity: "活动",
  coupon: "优惠券",
  product: "商品",
  category: "分类",
  user: "用户",
  payment: "支付",
  refund: "退款",
  amount: "金额",
  count: "数量",
  avg: "平均",
  daily: "日",
  mom: "环比",
  growth: "增长",
  claim: "领取",
  use: "使用",
  paid: "支付",
  gross: "总额",
  net: "净",
  items: "件",
  sold: "售出",
  warning: "预警",
  current: "当前",
  available: "可售",
  days: "天数",
  view: "浏览",
  cart: "购物车",
  favorite: "收藏",
  profit: "利润",
  margin: "毛利",
  conversion: "转化",
  checkout: "结算",
  start: "开始",
  result: "结果",
  no: "无",
  click: "点击",
  search: "搜索",
  active: "活跃",
  new: "新增",
  paying: "支付",
  pending: "待处理",
  cancelled: "取消",
  unpaid: "未支付",
  monthly: "月",
  hourly: "时",
};

function humanizeReportColumnKey(key: string): string {
  if (REPORT_COLUMN_LABELS[key]) return REPORT_COLUMN_LABELS[key];
  if (key.endsWith("_id")) {
    const base = key.slice(0, -3);
    const baseLabel = REPORT_COLUMN_LABELS[base] || REPORT_TOKEN_LABELS[base];
    return baseLabel ? `${baseLabel}编号` : `字段（${key}）`;
  }
  const parts = key.split("_").filter(Boolean);
  const labeled = parts.map((part) => REPORT_TOKEN_LABELS[part] ?? part);
  if (labeled.some((p) => /^[a-z]+$/i.test(String(p)))) return `字段（${key}）`;
  return labeled.join("");
}

export function labelReportColumn(key: string): string {
  return REPORT_COLUMN_LABELS[key] ?? humanizeReportColumnKey(key);
}

export const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: "待支付",
  unpaid: "未支付",
  paid: "已支付",
  success: "支付成功",
  refunded: "已退款",
  failed: "支付失败",
  cancelled: "已取消",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "待付款",
  paid: "待发货",
  processing: "处理中",
  shipped: "已发货",
  completed: "已完成",
  cancelled: "已取消",
  refunding: "退款中",
  refunded: "已退款",
};

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
  if (key === "payment_status") return labelFromMap(PAYMENT_STATUS_LABELS, s, s);
  if (key === "status") return labelFromMap(ORDER_STATUS_LABELS, s, s);
  if (key === "type" && ACTIVITY_TYPE_LABELS[s]) return labelFromMap(ACTIVITY_TYPE_LABELS, s, s);
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

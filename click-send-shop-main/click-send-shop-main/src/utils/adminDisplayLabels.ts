import { labelChannelCode } from "@/utils/paymentAdminLabels";

export const UNKNOWN_LABEL = "未知";

export function labelFromMap(
  map: Record<string, string>,
  value: string | null | undefined,
  fallback: string = UNKNOWN_LABEL,
): string {
  if (value == null || value === "") return "-";
  return map[value] ?? fallback;
}

export const REPORT_COLUMN_LABELS: Record<string, string> = {
  id: "编号",
  date: "日期",
  month: "月份",
  keyword: "关键词",
  category_id: "分类ID",
  coupon_id: "优惠券ID",
  coupon_campaign_id: "发券活动ID",
  coupon_campaign_title: "发券活动",
  coupon_campaign_type: "发券活动类型",
  activity_id: "活动ID",
  order_id: "订单ID",
  user_id: "用户ID",
  product_id: "商品ID",
  variant_id: "规格ID",
  order_count: "订单数",
  paid_order_count: "支付订单数",
  cancelled_order_count: "取消订单数",
  refund_order_count: "退款订单数",
  unpaid_order_count: "未支付订单数",
  gross_sales: "销售额",
  product_sales_amount: "商品销售额",
  paid_amount: "实收金额",
  discount_amount: "优惠金额",
  points_discount_amount: "积分抵扣",
  reward_cash_discount_amount: "返现余额抵扣",
  shipping_fee: "运费",
  shipping_income: "用户支付运费",
  shipping_cost_amount: "实际物流成本",
  payment_fee_amount: "支付手续费",
  refund_amount: "退款金额",
  net_sales: "净销售额",
  net_goods_sales_amount: "商品净销售额",
  goods_cost_amount: "商品成本",
  gross_profit: "毛利",
  gross_profit_amount: "商品毛利",
  gross_margin: "毛利率",
  expense_amount: "经营支出",
  net_profit_amount: "净利润",
  net_margin: "净利率",
  missing_cost_order_count: "缺成本订单数",
  missing_cost_item_count: "缺成本商品行数",
  items_sold: "销售件数",
  sales_qty: "销量",
  sales_amount: "销售额",
  discount_allocated: "分摊优惠",
  net_sales_amount: "净销售额",
  cost_amount: "成本金额",
  buyer_count: "购买用户",
  refund_qty: "退款件数",
  current_stock: "当前库存",
  inventory_cost_value: "库存成本",
  sales_7d: "近7天销量",
  sales_30d: "近30天销量",
  avg_daily_sales: "日均销量",
  available_stock_days: "可售天数",
  warning_stock: "预警库存",
  stock_status: "库存状态",
  view_count: "浏览量",
  add_cart_count: "加购量",
  favorite_count: "收藏量",
  conversion_rate: "转化率",
  average_order_value: "客单价",
  units_per_order: "每单件数",
  payment_rate: "支付率",
  refund_rate: "退款率",
  mom_growth_rate: "环比增长率",
  claim_rate: "领取率",
  use_rate: "使用率",
  roi: "投入产出比",
  issued_count: "发行数量",
  claimed_count: "领取数量",
  used_count: "使用数量",
  expired_count: "过期数量",
  paying_users: "付费用户数",
  active_users: "活跃用户数",
  order_users: "下单用户数",
  new_users: "新注册用户",
  repeat_buyer_count: "复购用户数",
  repeat_purchase_rate: "复购率",
  average_orders_per_buyer: "人均订单数",
  total_paid_amount: "付费总额",
  active_product_count: "在售商品数",
  stock_qty: "库存件数",
  product_count: "商品数",
  商品数: "商品数",
  分类数: "分类数",
  活动数: "活动数",
  优惠券数: "优惠券数",
  关键词数: "关键词数",
  今日销售额: "销售额",
  今日净销售额: "净销售额",
  今日支付订单数: "支付订单数",
  今日客单价: "客单价",
  今日退款金额: "退款金额",
  今日优惠金额: "优惠金额",
  search_count: "搜索次数",
  no_result_count: "无结果次数",
  user_count: "搜索用户数",
  pending_orders: "待处理订单",
  product_view_count: "商品浏览次数",
  product_click_count: "商品点击次数",
  add_to_cart_count: "加购次数",
  checkout_start_count: "发起结算次数",
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
  last_searched_at: "最后搜索时间",
  created_at: "创建时间",
  updated_at: "更新时间",
  path: "页面路径",
  page_type: "页面类型",
  pv: "PV",
  uv: "UV",
  sessions: "会话数",
  unique_ip_count: "独立 IP 数",
  online_visitors: "在线人数",
  new_visitors: "新访客",
  returning_visitors: "回访客",
  avg_duration_seconds: "平均停留秒数",
  bounce_rate: "跳出率",
  exit_count: "退出次数",
  traffic_source: "渠道",
  device: "设备",
  os: "操作系统",
  browser: "浏览器",
  browser_language: "浏览器语言",
  payment_success_count: "支付成功次数",
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
  sku_code: "SKU",
  barcode: "条码",
  title: "标题",
  value: "数值",
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
};

const REPORT_TOKEN_LABELS: Record<string, string> = {
  units: "件数", per: "每", order: "订单", rate: "率", sales: "销售", stock: "库存", status: "状态",
  type: "类型", activity: "活动", coupon: "优惠券", product: "商品", category: "分类", user: "用户",
  payment: "支付", refund: "退款", amount: "金额", count: "数量", avg: "平均", daily: "日", monthly: "月",
  mom: "环比", growth: "增长", claim: "领取", claimed: "领取", use: "使用", used: "使用", issued: "发行", expired: "过期",
  paid: "支付", gross: "毛", net: "净",
  items: "件", sold: "售出", warning: "预警", current: "当前", available: "可售", days: "天数",
  view: "浏览", cart: "购物车", favorite: "收藏", profit: "利润", margin: "毛利", conversion: "转化",
};

/** 系统内部 UUID 等长 ID，表格中缩短显示 */
export function formatInternalIdDisplay(value: unknown): string {
  const s = String(value ?? "").trim();
  if (!s) return "-";
  if (s.length <= 14) return s;
  return `${s.slice(0, 8)}…${s.slice(-4)}`;
}

function humanizeReportColumnKey(key: string): string {
  if (REPORT_COLUMN_LABELS[key]) return REPORT_COLUMN_LABELS[key];
  if (key.endsWith("_id")) {
    const base = key.slice(0, -3);
    const baseLabel = REPORT_COLUMN_LABELS[base] || REPORT_TOKEN_LABELS[base];
    return baseLabel ? `${baseLabel}ID` : `字段：${key}`;
  }
  const parts = key.split("_").filter(Boolean);
  const labeled = parts.map((part) => REPORT_TOKEN_LABELS[part] ?? part);
  if (labeled.some((p) => /^[a-z]+$/i.test(String(p)))) return `字段：${key}`;
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
  partially_refunded: "部分退款",
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
  low_stock: "低库存",
  normal: "正常",
  out: "缺货",
  out_of_stock: "缺货",
  slow_moving: "滞销",
};

/** 商品合规类型（API 值为英文枚举，管理端展示中文） */
export const COMPLIANCE_TYPE_LABELS: Record<string, string> = {
  normal: "普通商品",
  age_restricted: "年龄限制商品",
  regulated: "受监管商品",
};

export function labelComplianceType(type: string | null | undefined): string {
  if (!type) return "-";
  const key = String(type).trim().toLowerCase();
  return COMPLIANCE_TYPE_LABELS[key] ?? type;
}

export const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  flash_sale: "限时秒杀",
  full_reduction: "满减活动",
  coupon_activity: "发券活动",
  new_user_gift: "新人礼包",
  member_activity: "会员活动",
  points_bonus: "积分赠送",
  cashback_activity: "返现活动",
};

export function labelActivityType(type: string | undefined): string {
  if (!type) return "-";
  return ACTIVITY_TYPE_LABELS[type] || type;
}

export function labelReportCellValue(key: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "是" : "否";
  const s = String(value);
  if (key === "stock_status") return labelFromMap(STOCK_STATUS_LABELS, s, s);
  if (key === "activity_type") return labelFromMap(ACTIVITY_TYPE_LABELS, s, s);
  if (key === "payment_status") return labelFromMap(PAYMENT_STATUS_LABELS, s, s);
  if (key === "status") return labelFromMap(ORDER_STATUS_LABELS, s, s);
  if (key === "type" && ACTIVITY_TYPE_LABELS[s]) return labelFromMap(ACTIVITY_TYPE_LABELS, s, s);
  if (key === "roi" || key === "综合投入产出比") {
    if (value === null || value === undefined || value === "") return "-";
    const n = Number(value);
    return Number.isFinite(n) ? n.toFixed(2) : "-";
  }
  if (key.endsWith("_rate") && !Number.isNaN(Number(s))) return `${s}%`;
  if (key.endsWith("_id") && /[0-9a-f-]{8,}/i.test(s)) return formatInternalIdDisplay(s);
  return s;
}

export const POINTS_ACTION_LABELS: Record<string, string> = {
  order: "订单积分",
  order_redeem: "订单抵扣",
  order_redeem_reverse: "抵扣返还",
  order_earn: "订单发放",
  order_reverse: "积分冲正",
  pending_reverse: "待人工冲正",
  refund: "退款调整",
  sign_in: "签到",
  daily_checkin: "每日签到",
  invite_reward: "邀请奖励",
  admin_add: "后台增加",
  admin_deduct: "后台扣减",
  admin_adjust: "后台调整",
  redeem: "积分兑换",
  gift_redeem: "礼品兑换",
  gift_redeem_reverse: "礼品兑换退回",
  points_expire: "积分过期",
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
  operator: "运营",
  content_editor: "内容编辑",
  marketing: "营销",
  finance: "财务",
  warehouse: "仓储",
  customer_service: "客服",
};
export function labelRbacRoleCode(code: string): string {
  return labelFromMap(RBAC_ROLE_CODE_LABELS, code, "自定义角色");
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
  if (!method) return "-";
  return CHECKOUT_PAYMENT_METHOD_LABELS[method] || labelChannelCode(method) || "其他方式";
}
export const labelCheckoutPaymentMethod = labelOrderPaymentMethod;

export const COUPON_TYPE_LABELS: Record<string, string> = { fixed: "满减券", percentage: "折扣券", shipping: "运费券" };
export const COUPON_STATUS_LABELS: Record<string, string> = { available: "可用", expired: "已过期", disabled: "已停用" };
export const COUPON_RECORD_STATUS_LABELS: Record<string, string> = { available: "未使用", used: "已使用", expired: "已过期" };
export function labelCouponType(type: string): string { return labelFromMap(COUPON_TYPE_LABELS, type, "其他券种"); }
export function labelCouponStatus(status: string): string { return labelFromMap(COUPON_STATUS_LABELS, status, "其他状态"); }
export function labelCouponRecordStatus(status: string): string { return labelFromMap(COUPON_RECORD_STATUS_LABELS, status, "其他状态"); }

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  system: "系统通知",
  order: "订单通知",
  promotion: "营销通知",
  points: "积分通知",
  coupon: "优惠券通知",
  payment: "支付通知",
};
export function labelNotificationType(type: string): string { return labelFromMap(NOTIFICATION_TYPE_LABELS, type, "其他通知"); }

export const REWARD_STATUS_LABELS: Record<string, string> = {
  pending: "待发放",
  available: "可用",
  used: "已使用",
  expired: "已过期",
  reversed: "已冲正",
};
export function labelRewardStatus(status: string): string { return labelFromMap(REWARD_STATUS_LABELS, status, "其他状态"); }

export const EXPORT_TYPE_LABELS: Record<string, string> = {
  sales_daily: "销售日报",
  sales_monthly: "销售月报",
  profit_daily: "利润日报",
  profit_monthly: "利润月报",
  product_analysis: "商品分析",
  category_analysis: "分类分析",
  order_analysis: "订单分析",
  customer_analysis: "客户分析",
  activity_analysis: "活动分析",
  coupon_analysis: "优惠券分析",
  inventory_analysis: "库存分析",
  search_analysis: "搜索分析",
  traffic_analysis: "流量分析",
};
export function labelExportType(type: string): string { return labelFromMap(EXPORT_TYPE_LABELS, type, "其他导出"); }

export const RECYCLE_TYPE_LABELS: Record<string, string> = {
  products: "商品",
  categories: "分类",
  coupons: "优惠券",
  marketing_activities: "营销活动",
  coupon_campaigns: "发券活动",
  banners: "轮播图",
  content_pages: "内容页",
  product_reviews: "评论",
  product_tags: "商品标签",
  notifications: "通知",
  notification_batches: "通知批次",
  product_variants: "商品规格",
  product_spec_groups: "规格组",
  product_spec_values: "规格值",
  inventory_pack_rules: "组装拆包规则",
  users: "用户",
};

export function labelRecycleType(type: string, typeLabel?: string | null): string {
  const apiLabel = String(typeLabel ?? "").trim();
  if (apiLabel && /[\u4e00-\u9fff]/.test(apiLabel)) return apiLabel;
  const key = String(type ?? "").trim();
  if (!key) return "-";
  return labelFromMap(RECYCLE_TYPE_LABELS, key, apiLabel || "其他类型");
}

export const RECYCLE_TYPE_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: "", label: "全部类型" },
  ...Object.entries(RECYCLE_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

export function formatUserDisplay(nickname?: string | null, phone?: string | null): string {
  const name = String(nickname || "").trim();
  const mobile = String(phone || "").trim();
  if (name && mobile) return `${name}（${mobile}）`;
  return name || mobile || "-";
}

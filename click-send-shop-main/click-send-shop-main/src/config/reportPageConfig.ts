export type ReportFilterProfile =
  | "date"
  | "dateCategory"
  | "dateProduct"
  | "dateOrder"
  | "dateCustomer"
  | "dateActivity"
  | "dateCoupon"
  | "none";

export type ReportKpiProfile =
  | "profit"
  | "sales"
  | "order"
  | "product"
  | "category"
  | "customer"
  | "activity"
  | "coupon"
  | "inventory"
  | "search"
  | "overview"
  | "generic";

export type ReportExportMode = "standard" | "profit";

/** 利润报表汇总区固定展示顺序（不截断，确保净利润/净利率可见） */
export const PROFIT_REPORT_SUMMARY_PRIORITY_KEYS = [
  "paid_amount",
  "net_goods_sales_amount",
  "goods_cost_amount",
  "gross_profit_amount",
  "gross_margin",
  "expense_amount",
  "net_profit_amount",
  "net_margin",
  "missing_cost_order_count",
] as const;

export type ReportPageConfig = {
  reportKey: string;
  title: string;
  description: string;
  exportType?: string;
  exportMode?: ReportExportMode;
  filterProfile: ReportFilterProfile;
  kpiProfile: ReportKpiProfile;
  maxKpis?: number;
  /** 覆盖 kpiProfile 默认优先级；设置后仅展示列出的字段（不按 maxKpis 截断优先项） */
  summaryPriorityKeys?: string[];
  /** 汇总卡片上限；0 表示不截断。未设 summaryPriorityKeys 时回退 maxKpis */
  summaryMaxCards?: number;
  /** 销售日报等支持按日/周/月聚合时设为 true */
  supportsGranularity?: boolean;
};

export const REPORT_KPI_PRIORITIES: Record<ReportKpiProfile, string[]> = {
  profit: [...PROFIT_REPORT_SUMMARY_PRIORITY_KEYS],
  sales: [
    "gross_sales",
    "net_sales",
    "paid_order_count",
    "average_order_value",
    "refund_amount",
    "discount_amount",
    "payment_rate",
    "order_count",
    "refund_rate",
    "items_sold",
  ],
  order: [
    "paid_amount",
    "paid_order_count",
    "order_count",
    "average_order_value",
    "payment_rate",
    "refund_amount",
    "refund_rate",
    "unpaid_order_count",
    "cancelled_order_count",
    "refund_order_count",
  ],
  product: [
    "sales_amount",
    "gross_profit",
    "sales_qty",
    "order_count",
    "conversion_rate",
    "gross_margin",
    "view_count",
    "missing_cost_item_count",
    "buyer_count",
  ],
  customer: ["paying_users", "order_users", "active_users", "new_users"],
  activity: ["活动数", "有销售活动数", "支付订单数", "销售额", "销量", "优惠金额", "商品毛利", "product_count"],
  coupon: ["优惠券数", "issued_count", "claimed_count", "used_count", "claim_rate", "use_rate"],
  inventory: ["商品数", "缺货商品", "低库存商品", "滞销商品", "当前库存总量", "近7天销量", "近30天销量"],
  search: ["关键词数", "search_count", "no_result_count", "product_click_count", "order_count", "sales_amount"],
  category: ["分类数", "sales_amount", "sales_qty", "product_count", "active_product_count", "order_count", "stock_qty"],
  overview: [
    "今日销售额",
    "今日净销售额",
    "今日支付订单数",
    "今日客单价",
    "今日退款金额",
    "今日优惠金额",
    "待处理订单",
    "商品浏览次数",
    "加购次数",
    "发起结算次数",
  ],
  generic: [],
};

export const REPORT_PAGES: Record<string, ReportPageConfig> = {
  overview: {
    reportKey: "overview",
    title: "经营总览",
    description: "查看所选时间范围内的核心经营指标与商品排行。",
    filterProfile: "date",
    kpiProfile: "overview",
    maxKpis: 10,
  },
  sales_daily: {
    reportKey: "sales_daily",
    title: "销售日报",
    description: "按日汇总销售额、订单与退款，把握每日经营节奏。",
    exportType: "sales_daily",
    filterProfile: "date",
    supportsGranularity: true,
    kpiProfile: "sales",
    maxKpis: 10,
  },
  sales_monthly: {
    reportKey: "sales_monthly",
    title: "销售月报",
    description: "按月对比销售表现与环比变化，支持经营复盘。",
    exportType: "sales_monthly",
    filterProfile: "date",
    kpiProfile: "sales",
    maxKpis: 10,
  },
  profit_daily: {
    reportKey: "profit_daily",
    title: "利润报表",
    description: "按日查看实收、成本、毛利、经营支出与净利润。",
    exportType: "profit_daily",
    exportMode: "profit",
    filterProfile: "date",
    kpiProfile: "profit",
    summaryPriorityKeys: [...PROFIT_REPORT_SUMMARY_PRIORITY_KEYS],
    summaryMaxCards: 0,
  },
  profit_monthly: {
    reportKey: "profit_monthly",
    title: "利润报表",
    description: "按月查看实收、成本、毛利、经营支出与净利润。",
    exportType: "profit_monthly",
    exportMode: "standard",
    filterProfile: "date",
    kpiProfile: "profit",
    summaryPriorityKeys: [...PROFIT_REPORT_SUMMARY_PRIORITY_KEYS],
    summaryMaxCards: 0,
  },
  order_analysis: {
    reportKey: "order_analysis",
    title: "订单分析",
    description: "按日分析下单、支付、退款与客单价等订单指标。",
    exportType: "order_analysis",
    filterProfile: "dateOrder",
    kpiProfile: "order",
    maxKpis: 10,
  },
  product_analysis: {
    reportKey: "product_analysis",
    title: "商品分析",
    description: "对比商品销量、毛利与转化，识别爆款与滞销。",
    exportType: "product_analysis",
    filterProfile: "dateProduct",
    kpiProfile: "product",
    maxKpis: 9,
  },
  category_analysis: {
    reportKey: "category_analysis",
    title: "分类分析",
    description: "按分类汇总销量与在售商品，优化品类结构。",
    exportType: "category_analysis",
    filterProfile: "dateCategory",
    kpiProfile: "category",
    maxKpis: 8,
  },
  customer_analysis: {
    reportKey: "customer_analysis",
    title: "客户分析",
    description: "了解活跃、下单与付费用户规模及新客增长。",
    exportType: "customer_analysis",
    filterProfile: "dateCustomer",
    kpiProfile: "customer",
    maxKpis: 6,
  },
  activity_analysis: {
    reportKey: "activity_analysis",
    title: "活动分析",
    description: "查看营销活动覆盖商品与转化表现。",
    exportType: "activity_analysis",
    filterProfile: "dateActivity",
    kpiProfile: "activity",
    maxKpis: 8,
  },
  coupon_analysis: {
    reportKey: "coupon_analysis",
    title: "优惠券分析",
    description: "跟踪优惠券发放、领取与核销效率。",
    exportType: "coupon_analysis",
    filterProfile: "dateCoupon",
    kpiProfile: "coupon",
    maxKpis: 8,
  },
  inventory_analysis: {
    reportKey: "inventory_analysis",
    title: "库存分析",
    description: "监控库存水位与近期动销，及时补货或清仓。",
    exportType: "inventory_analysis",
    filterProfile: "none",
    kpiProfile: "inventory",
    maxKpis: 6,
  },
  search_analysis: {
    reportKey: "search_analysis",
    title: "搜索分析",
    description: "分析用户搜索词、无结果词与搜索后转化。",
    exportType: "search_analysis",
    filterProfile: "date",
    kpiProfile: "search",
    maxKpis: 8,
  },
};

import type { SiteCapabilities } from "@/types/siteCapabilities";
import {
  fetchActivityAnalysisReport,
  fetchCategoryAnalysisReport,
  fetchCouponAnalysisReport,
  fetchCustomerAnalysisReport,
  fetchInventoryAnalysisReport,
  fetchOrderAnalysisReport,
  fetchProductAnalysisReport,
  fetchProfitDailyReport,
  fetchProfitMonthlyReport,
  fetchReportOverview,
  fetchSalesDailyReport,
  fetchSalesMonthlyReport,
  fetchSearchAnalysisReport,
  fetchTrafficAnalysisReport,
} from "@/services/admin/reportService";

export type ReportFilterProfile =
  | "date"
  | "dateCategory"
  | "dateProduct"
  | "dateOrder"
  | "dateCustomer"
  | "dateActivity"
  | "dateCoupon"
  | "none";

export type ReportFilterKey =
  | "dateRange"
  | "granularity"
  | "categoryId"
  | "productId"
  | "activityId"
  | "couponId"
  | "orderStatus"
  | "paymentStatus"
  | "paymentMethod"
  | "keyword"
  | "noResultOnly"
  | "sortBy";

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
export type ReportShellType = "generic" | "custom" | "traffic" | "expense";
export type ReportGroup =
  | "经营总览"
  | "销售与利润"
  | "商品与库存"
  | "订单与客户"
  | "营销分析"
  | "流量与搜索"
  | "数据导出";

export type ReportRegistryItem = {
  key: string;
  reportKey: string;
  title: string;
  description: string;
  group: ReportGroup;
  routePath: string;
  legacyPaths: string[];
  fetcher: (params: Record<string, string>) => Promise<Record<string, unknown>>;
  endpoint: string;
  exportType?: string;
  exportMode?: ReportExportMode;
  permission: string;
  capability?: keyof SiteCapabilities;
  filterProfile: ReportFilterProfile;
  filters: ReportFilterKey[];
  kpiProfile: ReportKpiProfile;
  kpiPriorityKeys: string[];
  warningKeys: string[];
  columns: string[];
  supportsGranularity?: boolean;
  shellType: ReportShellType;
  exportable: boolean;
  dataScopeNote: string;
  maxKpis?: number;
  summaryPriorityKeys?: string[];
  summaryMaxCards?: number;
};

/** 利润报表汇总区固定展示顺序（不截断，确保净利润/净利率可见） */
export const PROFIT_REPORT_SUMMARY_PRIORITY_KEYS = [
  "net_profit_amount",
  "net_margin",
  "goods_cost_amount",
  "gross_profit_amount",
  "expense_amount",
  "paid_amount",
  "product_sales_amount",
  "discount_amount",
  "net_goods_sales_amount",
  "gross_margin",
  "shipping_income",
  "shipping_cost_amount",
  "payment_fee_amount",
  "refund_amount",
  "missing_cost_order_count",
  "missing_cost_item_count",
] as const;

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
  customer: ["paying_users", "order_users", "repeat_users", "repeat_rate", "average_order_value", "orders_per_user", "paid_amount", "new_users"],
  activity: ["活动数", "有销售活动数", "支付订单数", "销售额", "销量", "优惠金额", "商品毛利", "product_count"],
  coupon: ["优惠券数", "领取总量", "使用总量", "过期总量", "支付订单数", "带动销售额", "优惠成本", "净销售额", "商品毛利", "综合投入产出比"],
  inventory: ["商品数", "缺货商品", "低库存商品", "滞销商品", "当前库存总量", "近7天销量", "近30天销量"],
  search: ["关键词数", "search_count", "no_result_count", "product_click_count", "order_count", "sales_amount"],
  category: ["分类数", "sales_amount", "sales_qty", "product_count", "active_product_count", "order_count", "stock_qty"],
  overview: [
    "销售额",
    "净销售额",
    "支付订单数",
    "客单价",
    "退款金额",
    "优惠金额",
    "待处理订单",
    "商品浏览次数",
    "加购次数",
    "发起结算次数",
  ],
  generic: [],
};

const profitColumns = [
  "date",
  "month",
  "net_profit_amount",
  "net_margin",
  "paid_amount",
  "product_sales_amount",
  "discount_amount",
  "net_goods_sales_amount",
  "goods_cost_amount",
  "gross_profit_amount",
  "gross_margin",
  "shipping_income",
  "shipping_cost_amount",
  "payment_fee_amount",
  "refund_amount",
  "expense_amount",
  "missing_cost_order_count",
  "missing_cost_item_count",
];

export const REPORT_REGISTRY: ReportRegistryItem[] = [
  {
    key: "overview",
    reportKey: "overview",
    title: "经营总览",
    description: "查看所选时间范围内的核心经营指标、行为转化与商品排行。",
    group: "经营总览",
    routePath: "/admin/reports/overview",
    legacyPaths: [],
    fetcher: fetchReportOverview as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/overview",
    permission: "report.view",
    filterProfile: "date",
    filters: ["dateRange"],
    kpiProfile: "overview",
    kpiPriorityKeys: REPORT_KPI_PRIORITIES.overview,
    warningKeys: ["missing_cost_order_count", "missing_cost_item_count"],
    columns: [],
    shellType: "custom",
    exportable: false,
    dataScopeNote: "经营总览按当前筛选时间范围统计，不代表固定今日数据；利润请跳转利润日报或月报查看。",
    maxKpis: 10,
  },
  {
    key: "sales_daily",
    reportKey: "sales_daily",
    title: "销售日报",
    description: "按日汇总销售额、订单、退款与支付效率，把握每日经营节奏。",
    group: "销售与利润",
    routePath: "/admin/reports/daily",
    legacyPaths: ["/admin/reports/sales/daily"],
    fetcher: fetchSalesDailyReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/sales/daily",
    exportType: "sales_daily",
    permission: "report.view",
    filterProfile: "date",
    filters: ["dateRange", "granularity"],
    supportsGranularity: true,
    kpiProfile: "sales",
    kpiPriorityKeys: [...REPORT_KPI_PRIORITIES.sales, ...PROFIT_REPORT_SUMMARY_PRIORITY_KEYS],
    warningKeys: ["missing_cost_order_count", "missing_cost_item_count"],
    columns: ["date", "order_count", "paid_order_count", "gross_sales", "net_sales", "refund_amount", "discount_amount", "average_order_value", "payment_rate", "refund_rate", "goods_cost_amount", "gross_profit_amount", "gross_margin", "expense_amount", "net_profit_amount", "net_margin", "missing_cost_order_count", "missing_cost_item_count"],
    shellType: "generic",
    exportable: true,
    dataScopeNote: "销售日报仅将已支付订单计入销售额，利润字段与利润日报使用同一财务口径。",
    maxKpis: 12,
  },
  {
    key: "sales_monthly",
    reportKey: "sales_monthly",
    title: "销售月报",
    description: "按月对比销售、退款与利润表现，支持经营复盘。",
    group: "销售与利润",
    routePath: "/admin/reports/monthly",
    legacyPaths: ["/admin/reports/sales/monthly"],
    fetcher: fetchSalesMonthlyReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/sales/monthly",
    exportType: "sales_monthly",
    permission: "report.view",
    filterProfile: "date",
    filters: ["dateRange"],
    kpiProfile: "sales",
    kpiPriorityKeys: [...REPORT_KPI_PRIORITIES.sales, ...PROFIT_REPORT_SUMMARY_PRIORITY_KEYS],
    warningKeys: ["missing_cost_order_count", "missing_cost_item_count"],
    columns: ["month", "order_count", "paid_order_count", "gross_sales", "net_sales", "refund_amount", "discount_amount", "average_order_value", "payment_rate", "refund_rate", "goods_cost_amount", "gross_profit_amount", "gross_margin", "expense_amount", "net_profit_amount", "net_margin"],
    shellType: "generic",
    exportable: true,
    dataScopeNote: "销售月报的利润字段与利润月报使用同一财务口径。",
    maxKpis: 12,
  },
  {
    key: "profit_daily",
    reportKey: "profit_daily",
    title: "利润日报",
    description: "按日查看实收、成本、毛利、经营支出与净利润。",
    group: "销售与利润",
    routePath: "/admin/reports/profit/daily",
    legacyPaths: ["/admin/reports/profit"],
    fetcher: fetchProfitDailyReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/profit/daily",
    exportType: "profit_daily",
    exportMode: "profit",
    permission: "report.view",
    filterProfile: "date",
    filters: ["dateRange"],
    kpiProfile: "profit",
    kpiPriorityKeys: [...PROFIT_REPORT_SUMMARY_PRIORITY_KEYS],
    warningKeys: ["missing_cost_order_count", "missing_cost_item_count"],
    columns: profitColumns.filter((key) => key !== "month"),
    shellType: "generic",
    exportable: true,
    dataScopeNote: "净利润 = 商品毛利 + 运费收入 - 物流成本 - 支付手续费 - 退款金额 - 经营支出。",
    summaryPriorityKeys: [...PROFIT_REPORT_SUMMARY_PRIORITY_KEYS],
    summaryMaxCards: 0,
  },
  {
    key: "profit_monthly",
    reportKey: "profit_monthly",
    title: "利润月报",
    description: "按月查看实收、成本、毛利、经营支出与净利润。",
    group: "销售与利润",
    routePath: "/admin/reports/profit/monthly",
    legacyPaths: [],
    fetcher: fetchProfitMonthlyReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/profit/monthly",
    exportType: "profit_monthly",
    permission: "report.view",
    filterProfile: "date",
    filters: ["dateRange"],
    kpiProfile: "profit",
    kpiPriorityKeys: [...PROFIT_REPORT_SUMMARY_PRIORITY_KEYS],
    warningKeys: ["missing_cost_order_count", "missing_cost_item_count"],
    columns: profitColumns.filter((key) => key !== "date"),
    shellType: "generic",
    exportable: true,
    dataScopeNote: "利润月报按订单创建时间折算到马来西亚时区月份，并合并同月经营支出。",
    summaryPriorityKeys: [...PROFIT_REPORT_SUMMARY_PRIORITY_KEYS],
    summaryMaxCards: 0,
  },
  {
    key: "operating_expenses",
    reportKey: "operating_expenses",
    title: "经营支出",
    description: "维护经营支出记录，并用于利润日报、利润月报净利润计算。",
    group: "销售与利润",
    routePath: "/admin/reports/expenses",
    legacyPaths: [],
    fetcher: async () => ({}),
    endpoint: "/admin/expenses",
    exportType: "operating_expenses",
    permission: "report.view",
    filterProfile: "date",
    filters: ["dateRange"],
    kpiProfile: "generic",
    kpiPriorityKeys: [],
    warningKeys: [],
    columns: ["expense_date", "category", "amount", "title", "remark"],
    shellType: "expense",
    exportable: true,
    dataScopeNote: "经营支出按支出日期计入利润报表，新增、编辑、删除后利润会随查询重新计算。",
  },
  {
    key: "product_analysis",
    reportKey: "product_analysis",
    title: "商品分析",
    description: "对比商品销量、销售额、毛利与转化，识别爆款与滞销。",
    group: "商品与库存",
    routePath: "/admin/reports/products",
    legacyPaths: ["/admin/reports/products/analysis"],
    fetcher: fetchProductAnalysisReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/products/analysis",
    exportType: "product_analysis",
    permission: "report.view",
    filterProfile: "dateProduct",
    filters: ["dateRange", "categoryId", "productId"],
    kpiProfile: "product",
    kpiPriorityKeys: REPORT_KPI_PRIORITIES.product,
    warningKeys: ["missing_cost_item_count"],
    columns: ["product_name", "product_id", "category_path", "sales_qty", "sales_amount", "order_count", "buyer_count", "cost_amount", "gross_profit", "gross_margin", "view_count", "conversion_rate", "missing_cost_item_count"],
    shellType: "generic",
    exportable: true,
    dataScopeNote: "商品销售仅统计已支付且未取消订单；缺成本商品会影响毛利准确性。",
    maxKpis: 9,
  },
  {
    key: "category_analysis",
    reportKey: "category_analysis",
    title: "分类分析",
    description: "按分类汇总销量、销售额、毛利与库存，优化品类结构。",
    group: "商品与库存",
    routePath: "/admin/reports/categories",
    legacyPaths: ["/admin/reports/categories/analysis"],
    fetcher: fetchCategoryAnalysisReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/categories/analysis",
    exportType: "category_analysis",
    permission: "report.view",
    filterProfile: "dateCategory",
    filters: ["dateRange", "categoryId"],
    kpiProfile: "category",
    kpiPriorityKeys: REPORT_KPI_PRIORITIES.category,
    warningKeys: [],
    columns: ["category_path", "product_count", "active_product_count", "sales_qty", "sales_amount", "order_count", "buyer_count", "gross_profit_amount", "gross_margin", "stock_qty"],
    shellType: "generic",
    exportable: true,
    dataScopeNote: "分类销售口径与销售日报一致，仅统计已支付订单。",
    maxKpis: 8,
  },
  {
    key: "inventory_analysis",
    reportKey: "inventory_analysis",
    title: "库存分析",
    description: "监控库存水位、近期动销与可售天数，及时补货或清仓。",
    group: "商品与库存",
    routePath: "/admin/reports/inventory",
    legacyPaths: ["/admin/reports/inventory/analysis"],
    fetcher: fetchInventoryAnalysisReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/inventory/analysis",
    exportType: "inventory_analysis",
    permission: "report.view",
    capability: "inventoryEnabled",
    filterProfile: "none",
    filters: [],
    kpiProfile: "inventory",
    kpiPriorityKeys: REPORT_KPI_PRIORITIES.inventory,
    warningKeys: [],
    columns: ["product_name", "current_stock", "warning_stock", "sales_7d", "sales_30d", "avg_daily_sales", "available_stock_days", "stock_status"],
    shellType: "custom",
    exportable: true,
    dataScopeNote: "库存动销基于最近 7/30 天已支付订单计算；无销量时可售天数不展示为 0。",
    maxKpis: 6,
  },
  {
    key: "order_analysis",
    reportKey: "order_analysis",
    title: "订单分析",
    description: "按日分析下单、支付、取消、退款与客单价等订单指标。",
    group: "订单与客户",
    routePath: "/admin/reports/orders",
    legacyPaths: ["/admin/reports/orders/analysis"],
    fetcher: fetchOrderAnalysisReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/orders/analysis",
    exportType: "order_analysis",
    permission: "report.view",
    filterProfile: "dateOrder",
    filters: ["dateRange", "orderStatus", "paymentStatus", "paymentMethod"],
    kpiProfile: "order",
    kpiPriorityKeys: REPORT_KPI_PRIORITIES.order,
    warningKeys: [],
    columns: ["date", "order_count", "paid_order_count", "unpaid_order_count", "cancelled_order_count", "refund_order_count", "paid_amount", "refund_amount", "average_order_value", "payment_rate", "refund_rate"],
    shellType: "generic",
    exportable: true,
    dataScopeNote: "订单分析的状态和支付筛选会传递到后端订单聚合查询。",
    maxKpis: 10,
  },
  {
    key: "customer_analysis",
    reportKey: "customer_analysis",
    title: "客户分析",
    description: "了解新客、下单用户、付款用户、复购与人均订单表现。",
    group: "订单与客户",
    routePath: "/admin/reports/customers",
    legacyPaths: ["/admin/reports/customers/analysis"],
    fetcher: fetchCustomerAnalysisReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/customers/analysis",
    exportType: "customer_analysis",
    permission: "report.view",
    filterProfile: "dateCustomer",
    filters: ["dateRange"],
    kpiProfile: "customer",
    kpiPriorityKeys: REPORT_KPI_PRIORITIES.customer,
    warningKeys: [],
    columns: [],
    shellType: "generic",
    exportable: true,
    dataScopeNote: "客户分析当前为汇总型报表，统计所选时间内新用户、下单用户、付款用户、复购用户。",
    maxKpis: 8,
  },
  {
    key: "activity_analysis",
    reportKey: "activity_analysis",
    title: "活动分析",
    description: "查看营销活动基础信息与可用的销售归因表现。",
    group: "营销分析",
    routePath: "/admin/reports/activities",
    legacyPaths: ["/admin/reports/activities/analysis"],
    fetcher: fetchActivityAnalysisReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/activities/analysis",
    exportType: "activity_analysis",
    permission: "report.view",
    filterProfile: "dateActivity",
    filters: ["dateRange", "activityId"],
    kpiProfile: "activity",
    kpiPriorityKeys: REPORT_KPI_PRIORITIES.activity,
    warningKeys: ["sales_tracking_available"],
    columns: ["activity_title", "activity_type", "start_at", "end_at", "product_count", "paid_order_count", "sales_qty", "sales_amount", "discount_amount", "gross_profit_amount", "view_count", "conversion_rate"],
    shellType: "generic",
    exportable: true,
    dataScopeNote: "只有订单明细记录活动快照时才展示活动销售归因字段。",
    maxKpis: 8,
  },
  {
    key: "coupon_analysis",
    reportKey: "coupon_analysis",
    title: "优惠券分析",
    description: "跟踪优惠券发放、领取、核销、销售额、优惠成本与 ROI。",
    group: "营销分析",
    routePath: "/admin/reports/coupons",
    legacyPaths: ["/admin/reports/coupons/analysis"],
    fetcher: fetchCouponAnalysisReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/coupons/analysis",
    exportType: "coupon_analysis",
    permission: "report.view",
    capability: "couponEnabled",
    filterProfile: "dateCoupon",
    filters: ["dateRange", "couponCampaignId", "couponId"],
    kpiProfile: "coupon",
    kpiPriorityKeys: REPORT_KPI_PRIORITIES.coupon,
    warningKeys: [],
    columns: ["coupon_campaign_title", "coupon_campaign_type", "coupon_title", "issued_count", "claimed_count", "used_count", "expired_count", "claim_rate", "use_rate", "paid_order_count", "sales_amount", "discount_amount", "net_sales", "gross_profit_amount", "roi"],
    shellType: "generic",
    exportable: true,
    dataScopeNote: "领取按 claimed_at、使用按 used_at、过期按券有效期统计；ROI 无法计算时显示为空。",
    maxKpis: 8,
  },
  {
    key: "search_analysis",
    reportKey: "search_analysis",
    title: "搜索分析",
    description: "分析用户搜索词、无结果词，以及可用的搜索后点击和转化。",
    group: "流量与搜索",
    routePath: "/admin/reports/search",
    legacyPaths: ["/admin/reports/search/analysis"],
    fetcher: fetchSearchAnalysisReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/search/analysis",
    exportType: "search_analysis",
    permission: "report.view",
    filterProfile: "date",
    filters: ["dateRange", "keyword", "noResultOnly", "sortBy"],
    kpiProfile: "search",
    kpiPriorityKeys: REPORT_KPI_PRIORITIES.search,
    warningKeys: ["analytics_downgraded"],
    columns: ["keyword", "search_count", "no_result_count", "product_click_count", "order_count", "sales_amount", "last_searched_at"],
    shellType: "generic",
    exportable: true,
    dataScopeNote: "搜索转化字段依赖搜索和行为埋点链路；埋点缺失时隐藏或提示降级。",
    maxKpis: 8,
  },
  {
    key: "traffic_analysis",
    reportKey: "traffic_analysis",
    title: "流量分析",
    description: "查看 PV、UV、来源、设备、页面路径和转化漏斗。",
    group: "流量与搜索",
    routePath: "/admin/reports/traffic",
    legacyPaths: [],
    fetcher: fetchTrafficAnalysisReport as ReportRegistryItem["fetcher"],
    endpoint: "/admin/reports/traffic",
    exportType: "traffic_analysis",
    permission: "report.view",
    capability: "trafficAnalyticsEnabled",
    filterProfile: "date",
    filters: ["dateRange", "granularity"],
    supportsGranularity: true,
    kpiProfile: "generic",
    kpiPriorityKeys: [],
    warningKeys: ["analytics_downgraded"],
    columns: [],
    shellType: "traffic",
    exportable: true,
    dataScopeNote: "流量分析基于 analytics_events 埋点表；表或字段缺失时页面显示降级说明。",
  },
];

export const REPORT_REGISTRY_BY_KEY = Object.fromEntries(
  REPORT_REGISTRY.map((item) => [item.key, item]),
) as Record<string, ReportRegistryItem>;

export const EXPORTABLE_REPORTS = REPORT_REGISTRY.filter((item) => item.exportable && item.exportType);

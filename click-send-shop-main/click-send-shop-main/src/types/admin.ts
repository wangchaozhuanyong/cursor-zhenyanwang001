export interface AdminUser {
  id: string;
  /** 兼容：后端可能返回 nickname 或 username 作为展示名 */
  username?: string;
  nickname?: string;
  phone?: string;
  email?: string;
  role: "super_admin" | "admin" | "editor";
  avatar?: string;
  last_login?: string;
  /** RBAC */
  permissions?: string[];
  isSuperAdmin?: boolean;
  roleCodes?: string[];
}

export interface AdminLoginParams {
  username: string;
  phone?: string;
  countryCode?: string;
  password: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalOrders: number;
  totalRevenue: number;
  todayOrders: number;
  todayRevenue: number;
  monthlyOrders: number;
  monthlyRevenue: number;
}

export interface DashboardChartPoint {
  date: string;
  sales: number;
}

export interface DashboardCategorySlice {
  name: string;
  value: number;
}

export interface DashboardWeeklyOrderPoint {
  day: string;
  orders?: number;
  completed?: number;
  cancelled?: number;
}

export interface DashboardRecentOrderRow {
  id: string;
  order_no?: string;
  status?: string;
  contact_name?: string;
  total_amount?: number;
  final_amount?: number;
  created_at?: string;
}

/** /admin/dashboard/stats 完整响应（图表 + 卡片指标） */
export interface DashboardOverview extends DashboardStats {
  todayNewUsers?: number;
  pendingOrders?: number;
  totalProducts?: number;
  salesTrend?: DashboardChartPoint[];
  categoryData?: DashboardCategorySlice[];
  weeklyOrders?: DashboardWeeklyOrderPoint[];
  recentOrders?: DashboardRecentOrderRow[];
}

/**
 * 站点设置（管理后台 /admin/settings 读写）
 * 字段命名与后端 site_settings.setting_key 一致（驼峰）
 * 所有字段均为可选 - 后台首次进入时可能尚未填写
 */
export interface SiteSettings {
  /* 基础品牌 */
  siteName?: string;
  siteDescription?: string;
  siteSlogan?: string;
  logoUrl?: string;
  faviconUrl?: string;

  /* 联系方式 */
  contactPhone?: string;
  contactEmail?: string;
  contactWhatsApp?: string;
  whatsappUrl?: string;
  wechatId?: string;
  address?: string;
  businessHours?: string;

  /* 社交 */
  instagramUrl?: string;
  facebookUrl?: string;
  tiktokUrl?: string;
  xhsUrl?: string;

  /* 业务 */
  currency?: string;
  /** 自动确认收货：'1' 开启 / '0' 关闭 */
  autoConfirmReceiveEnabled?: string;
  /** 发货后天数（1–365，字符串与 site_settings 一致） */
  autoConfirmReceiveDays?: string;
  /** 未支付订单自动取消：'1' 开启 / '0' 关闭（仅在线支付待付款订单） */
  orderPaymentTimeoutEnabled?: string;
  /** 未支付超时分钟数（1–43200，字符串与 site_settings 一致） */
  orderPaymentTimeoutMinutes?: string;
  /** SST：'1' 开启 */
  sstEnabled?: string;
  sstRatePercent?: string;
  sstLabel?: string;
  sstCustomerNote?: string;

  /* SEO */
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImageUrl?: string;
  googleSiteVerification?: string;
  defaultOgImageUrl?: string;
  complianceNotice?: string;
  ageGateEnabled?: string;
  minimumAge?: string;
  restrictedProductNoindexEnabled?: string;

  /* 页脚 */
  footerCompanyName?: string;
  footerCopyright?: string;
  footerIcpNo?: string;
  footerPolicyUrl?: string;
  footerTermsUrl?: string;

  /* 政策内部页路径（CMS slug 路由） */
  privacyPolicyPath?: string;
  termsPath?: string;
  refundPolicyPath?: string;
  shippingPolicyPath?: string;

  /* 购物 / 售后 / 支付说明文案 */
  supportText?: string;
  shippingNotice?: string;
  paymentNotice?: string;

  /* 自定义页脚导航 JSON 字符串 [{label,path}] */
  footerNav?: string;

  /* 首页新品运营主视觉 */
  newArrivalSectionTitle?: string;
  newArrivalSectionSubtitle?: string;
  newArrivalDisplayCount?: string;
  newArrivalShowPrice?: string;
  newArrivalOnlyInStock?: string;

  /* 客服下载页配置 */
  supportDownloadConfig?: string;

  /* 分析 / 广告埋点配置：脚本仍受 Cookie 同意状态控制 */
  ga4Enabled?: string;
  ga4MeasurementId?: string;
  metaPixelEnabled?: string;
  metaPixelId?: string;
  helpCenterConfig?: string;

  /* 允许任意扩展键（运营后期新增字段无需先发版） */
  [key: string]: string | undefined;
}

export interface ReportData {
  labels: string[];
  datasets: { label: string; data: number[] }[];
}

export interface ContentPage {
  id: string;
  slug: string;
  title: string;
  content: string;
  publish_status?: "published" | "draft";
  sort_order?: number;
  updated_at: string;
  updatedAt?: string;
}

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
  brandColor?: string;

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

  /* SEO */
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImageUrl?: string;

  /* 页脚 */
  footerCompanyName?: string;
  footerCopyright?: string;
  footerIcpNo?: string;
  footerPolicyUrl?: string;
  footerTermsUrl?: string;

  /* 允许任意扩展键（运营后期新增字段无需先发版） */
  [key: string]: string | undefined;
}

export interface AdminLog {
  id: string;
  admin_id: string;
  admin_name: string;
  action: string;
  target: string;
  detail: string;
  ip: string;
  created_at: string;
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
  updated_at: string;
}

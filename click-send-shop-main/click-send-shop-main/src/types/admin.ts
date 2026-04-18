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

export interface SiteSettings {
  siteName: string;
  logo: string;
  contactPhone: string;
  contactEmail: string;
  contactWhatsapp: string;
  aboutText: string;
  announcementText: string;
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

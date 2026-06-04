import type { ActivityListParams } from "@/api/admin/activity";
import type { CouponCampaignListParams } from "@/api/admin/couponCampaign";
import type { DataCleanupRunListParams } from "@/api/admin/dataRetention";
import type { AdminFeedbackListParams } from "@/api/admin/feedback";
import type { OrderListParams } from "@/types/order";
import type { ProductListParams } from "@/types/product";

export type RecycleBinListParams = { type?: string; page?: number; pageSize?: number };
export type CheckoutAbandonmentListParams = {
  page?: number;
  pageSize?: number;
  status?: string;
  keyword?: string;
};
export type PointsRecordsListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  userId?: string;
  action?: string;
};
export type RewardRecordsListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  status?: string;
};
export type InviteRecordsListParams = { page?: number; pageSize?: number; keyword?: string };
export type PaymentReconciliationListParams = { page?: string; pageSize?: string };
export type OperatingExpensesListParams = {
  range_preset?: string;
  date_from?: string;
  date_to?: string;
  category?: string;
};
export type ReviewListParams = Record<string, string | number | undefined>;
export type TrafficReportParams = Record<string, string>;
export type AuditLogListParams = {
  page?: number;
  pageSize?: number;
  keyword?: string;
  result?: string;
  dateFrom?: string;
  dateTo?: string;
  operatorId?: string;
  objectType?: string;
  objectId?: string;
  actionType?: string;
  sortOrder?: string;
};
export type AdminEventListParams = {
  page?: number;
  pageSize?: number;
  tab?: string;
  status?: string;
  category?: string;
  severity?: string;
  unread?: string | boolean;
  keyword?: string;
};

export const adminQueryKeys = {
  root: ["admin"] as const,
  dashboard: () => ["admin", "dashboard"] as const,
  ordersRoot: () => ["admin", "orders"] as const,
  orders: (filters?: OrderListParams) => ["admin", "orders", filters ?? {}] as const,
  orderSummary: (filters?: OrderListParams) => ["admin", "orders", "summary", filters ?? {}] as const,
  orderDetail: (id: string) => ["admin", "orders", "detail", id] as const,
  checkoutAbandonmentsRoot: () => ["admin", "orders", "checkout-abandonments"] as const,
  checkoutAbandonments: (filters?: CheckoutAbandonmentListParams) =>
    ["admin", "orders", "checkout-abandonments", filters ?? {}] as const,
  paymentsRoot: () => ["admin", "payments"] as const,
  paymentChannels: () => ["admin", "payments", "channels"] as const,
  paymentReconciliationsRoot: () => ["admin", "payments", "reconciliations"] as const,
  paymentReconciliations: (filters?: PaymentReconciliationListParams) =>
    ["admin", "payments", "reconciliations", filters ?? {}] as const,
  returnsRoot: () => ["admin", "returns"] as const,
  notificationsRoot: () => ["admin", "notifications"] as const,
  eventCenterRoot: () => ["admin", "event-center"] as const,
  eventCenterEvents: (filters?: AdminEventListParams) => ["admin", "event-center", "events", filters ?? {}] as const,
  eventCenterSummary: (params?: Pick<AdminEventListParams, "tab" | "category" | "severity" | "unread" | "keyword">) => ["admin", "event-center", "summary", params] as const,
  eventCenterBossMetrics: () => ["admin", "event-center", "boss-metrics"] as const,
  eventCenterRules: () => ["admin", "event-center", "rules"] as const,
  inventoryRoot: () => ["admin", "inventory"] as const,
  productsRoot: () => ["admin", "products"] as const,
  products: (filters?: ProductListParams) => ["admin", "products", filters ?? {}] as const,
  productTags: () => ["admin", "products", "tags"] as const,
  categories: () => ["admin", "products", "categories"] as const,
  shippingRoot: () => ["admin", "shipping"] as const,
  shippingTemplates: () => ["admin", "shipping", "templates"] as const,
  usersRoot: () => ["admin", "users"] as const,
  userDetail: (id: string) => ["admin", "users", "detail", id] as const,
  feedbackRoot: () => ["admin", "feedback"] as const,
  feedback: (filters?: AdminFeedbackListParams) => ["admin", "feedback", filters ?? {}] as const,
  memberLevelsRoot: () => ["admin", "member-levels"] as const,
  memberLevels: () => ["admin", "member-levels", "list"] as const,
  pointsRoot: () => ["admin", "points"] as const,
  pointsOverview: () => ["admin", "points", "overview"] as const,
  pointsRecordsRoot: () => ["admin", "points", "records"] as const,
  pointsRecords: (filters?: PointsRecordsListParams) => ["admin", "points", "records", filters ?? {}] as const,
  pointsRules: () => ["admin", "points", "rules"] as const,
  rewardsRoot: () => ["admin", "rewards"] as const,
  rewardRecords: (filters?: RewardRecordsListParams) => ["admin", "rewards", "records", filters ?? {}] as const,
  referralRules: () => ["admin", "rewards", "referral-rules"] as const,
  rewardSettings: () => ["admin", "rewards", "settings"] as const,
  invitesRoot: () => ["admin", "invites"] as const,
  inviteRecords: (filters?: InviteRecordsListParams) => ["admin", "invites", "records", filters ?? {}] as const,
  couponsRoot: () => ["admin", "coupons"] as const,
  coupons: () => ["admin", "coupons", "list"] as const,
  couponRecordsRoot: () => ["admin", "coupons", "records"] as const,
  couponRecords: () => ["admin", "coupons", "records", "list"] as const,
  couponCampaignsRoot: () => ["admin", "coupon-campaigns"] as const,
  couponCampaigns: (filters?: CouponCampaignListParams) => ["admin", "coupon-campaigns", filters ?? {}] as const,
  couponCampaignDetail: (id: string) => ["admin", "coupon-campaigns", "detail", id] as const,
  activitiesRoot: () => ["admin", "activities"] as const,
  activities: (filters?: ActivityListParams) => ["admin", "activities", filters ?? {}] as const,
  marketingDashboard: () => ["admin", "marketing", "dashboard"] as const,
  reviewsRoot: () => ["admin", "reviews"] as const,
  reviews: (filters?: ReviewListParams) => ["admin", "reviews", filters ?? {}] as const,
  reviewDetail: (id: string) => ["admin", "reviews", "detail", id] as const,
  reportsRoot: () => ["admin", "reports"] as const,
  report: (slug: string, filters?: Record<string, string>) => ["admin", "reports", slug, filters ?? {}] as const,
  trafficReport: (filters?: TrafficReportParams) => ["admin", "reports", "traffic", filters ?? {}] as const,
  operatingExpenses: (filters?: OperatingExpensesListParams) =>
    ["admin", "reports", "operating-expenses", filters ?? {}] as const,
  exportTasks: () => ["admin", "reports", "export-tasks"] as const,
  recycleBinRoot: () => ["admin", "recycle-bin"] as const,
  recycleBin: (filters?: RecycleBinListParams) => ["admin", "recycle-bin", filters ?? {}] as const,
  rbacRoot: () => ["admin", "rbac"] as const,
  rbacOverview: () => ["admin", "rbac", "overview"] as const,
  rbacMfaPolicy: () => ["admin", "rbac", "mfa-policy"] as const,
  rbacUserRoles: (userId: string) => ["admin", "rbac", "user-roles", userId] as const,
  accounts: () => ["admin", "rbac", "accounts"] as const,
  accountSecurity: (userId: string) => ["admin", "rbac", "accounts", userId, "security"] as const,
  auditLogsRoot: () => ["admin", "audit-logs"] as const,
  auditLogs: (filters?: AuditLogListParams) => ["admin", "audit-logs", filters ?? {}] as const,
  dataCleanupRoot: () => ["admin", "data-cleanup"] as const,
  dataCleanupOverview: () => ["admin", "data-cleanup", "overview"] as const,
  dataCleanupPolicies: () => ["admin", "data-cleanup", "policies"] as const,
  dataCleanupRuns: (filters?: DataCleanupRunListParams) => ["admin", "data-cleanup", "runs", filters ?? {}] as const,
  dataCleanupRun: (id: string | number) => ["admin", "data-cleanup", "run", String(id)] as const,
  backupsRoot: () => ["admin", "backups"] as const,
  backupsOverview: () => ["admin", "backups", "overview"] as const,
  backupsHealth: () => ["admin", "backups", "health"] as const,
  backupFiles: (filters?: Record<string, unknown>) => ["admin", "backups", "files", filters ?? {}] as const,
  backupAlerts: () => ["admin", "backups", "alerts"] as const,
  restoreJobs: (filters?: Record<string, unknown>) => ["admin", "restore", "jobs", filters ?? {}] as const,
  restoreDrills: () => ["admin", "restore", "drills"] as const,
  banners: () => ["admin", "banners"] as const,
  contentHub: () => ["admin", "content", "hub"] as const,
  homeOpsNav: () => ["admin", "home-ops", "nav"] as const,
  reportOverview: (filters?: Record<string, string>) => ["admin", "reports", "overview", filters ?? {}] as const,
  settingsRoot: () => ["admin", "settings"] as const,
  siteSettings: () => ["admin", "settings", "site"] as const,
  siteCapabilities: () => ["admin", "settings", "capabilities"] as const,
  telegramSettings: () => ["admin", "settings", "telegram"] as const,
  themeSkins: () => ["admin", "settings", "theme-skins"] as const,
  homeOpsSettings: () => ["admin", "home-ops", "settings"] as const,
  couponDetail: (id: string) => ["admin", "coupons", "detail", id] as const,
  couponFormProducts: (filters?: ProductListParams) => ["admin", "coupons", "form-products", filters ?? {}] as const,
  activityDetail: (id: string) => ["admin", "activities", "detail", id] as const,
  activityFormCoupons: () => ["admin", "activities", "form-coupons"] as const,
  productForm: (id: string) => ["admin", "products", "form", id] as const,
};

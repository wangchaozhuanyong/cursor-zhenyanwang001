export type PathRule =
  | { kind: "one"; permission: string }
  | { kind: "any"; permissions: string[] };

export type AdminRouteMatcher<T> = {
  test: (path: string) => boolean;
} & T;

export type AdminRouteTitleRule = AdminRouteMatcher<{
  titleKey: string;
}>;

export type AdminRouteAccessRule = AdminRouteMatcher<{
  rule: PathRule;
}>;

const one = (permission: string): PathRule => ({ kind: "one", permission });
const any = (permissions: string[]): PathRule => ({ kind: "any", permissions });

export const ADMIN_ROUTE_TITLE_RULES: AdminRouteTitleRule[] = [
  { test: (p) => p === "/admin" || p === "/admin/", titleKey: "routeTitles.admin" },
  { test: (p) => p === "/admin/account", titleKey: "routeTitles.account" },
  { test: (p) => p === "/admin/products/new", titleKey: "routeTitles.productNewFull" },
  { test: (p) => /^\/admin\/products\/[^/]+$/.test(p), titleKey: "routeTitles.productEditFull" },
  {
    test: (p) => /^\/admin\/orders\/[^/]+$/.test(p) && !p.startsWith("/admin/orders/unfinished"),
    titleKey: "routeTitles.orderDetailFull",
  },
  { test: (p) => /^\/admin\/users\/[^/]+$/.test(p), titleKey: "routeTitles.userDetailFull" },
  { test: (p) => /^\/admin\/notifications\/[^/]+$/.test(p), titleKey: "routeTitles.notificationDetailFull" },
  { test: (p) => p === "/admin/marketing/coupons/new", titleKey: "routeTitles.couponNewFull" },
  { test: (p) => p === "/admin/marketing/coupon-campaigns/new", titleKey: "routeTitles.couponNewFull" },
  { test: (p) => /^\/admin\/marketing\/coupon-campaigns\/[^/]+$/.test(p), titleKey: "routeTitles.coupons" },
  {
    test: (p) => /^\/admin\/marketing\/coupons\/[^/]+$/.test(p) && p !== "/admin/marketing/coupons/records",
    titleKey: "routeTitles.couponEditFull",
  },
  { test: (p) => p.startsWith("/admin/settings/site"), titleKey: "routeTitles.siteSettings" },
  { test: (p) => p.startsWith("/admin/settings/features"), titleKey: "routeTitles.siteSettings" },
  { test: (p) => p.startsWith("/admin/settings/telegram"), titleKey: "routeTitles.telegram" },
  { test: (p) => p.startsWith("/admin/settings/theme"), titleKey: "routeTitles.theme" },
  { test: (p) => p.startsWith("/admin/home-ops"), titleKey: "routeTitles.homeOps" },
  { test: (p) => p.startsWith("/admin/support-download"), titleKey: "routeTitles.supportDownload" },
  { test: (p) => p.startsWith("/admin/banners"), titleKey: "routeTitles.banners" },
  { test: (p) => p.startsWith("/admin/content"), titleKey: "routeTitles.content" },
  { test: (p) => p.startsWith("/admin/payments"), titleKey: "routeTitles.payments" },
  { test: (p) => p.startsWith("/admin/returns"), titleKey: "routeTitles.returns" },
  { test: (p) => p.startsWith("/admin/reviews"), titleKey: "routeTitles.reviews" },
  { test: (p) => p.startsWith("/admin/accounts") || p.startsWith("/admin/settings/roles"), titleKey: "routeTitles.staff" },
  { test: (p) => p === "/admin/marketing", titleKey: "routeTitles.marketing" },
  { test: (p) => p === "/admin/marketing/activities/new", titleKey: "routeTitles.marketingNewFull" },
  { test: (p) => /^\/admin\/marketing\/activities\/[^/]+\/edit$/.test(p), titleKey: "routeTitles.marketingEditFull" },
  { test: (p) => p.startsWith("/admin/marketing/activities"), titleKey: "routeTitles.marketingActivities" },
  { test: (p) => p.startsWith("/admin/marketing/coupon-campaigns"), titleKey: "routeTitles.coupons" },
  { test: (p) => p.startsWith("/admin/marketing/coupons/records"), titleKey: "routeTitles.couponRecords" },
  { test: (p) => p.startsWith("/admin/marketing/coupons"), titleKey: "routeTitles.coupons" },
  { test: (p) => p.startsWith("/admin/marketing/points"), titleKey: "routeTitles.points" },
  { test: (p) => p.startsWith("/admin/marketing/rewards"), titleKey: "routeTitles.rewards" },
  { test: (p) => p.startsWith("/admin/marketing/invites"), titleKey: "routeTitles.invites" },
  { test: (p) => p.startsWith("/admin/feedback"), titleKey: "routeTitles.feedback" },
  { test: (p) => p.startsWith("/admin/user-security"), titleKey: "routeTitles.users" },
  { test: (p) => p.startsWith("/admin/users"), titleKey: "routeTitles.users" },
  { test: (p) => p.startsWith("/admin/member-levels"), titleKey: "routeTitles.memberLevels" },
  { test: (p) => p.startsWith("/admin/orders/unfinished"), titleKey: "routeTitles.unfinishedOrders" },
  { test: (p) => p.startsWith("/admin/orders"), titleKey: "routeTitles.orders" },
  {
    test: (p) => p.startsWith("/admin/products") || p.startsWith("/admin/categories") || p.startsWith("/admin/inventory") || p.startsWith("/admin/tags"),
    titleKey: "routeTitles.products",
  },
  { test: (p) => p.startsWith("/admin/reports/traffic"), titleKey: "routeTitles.traffic" },
  { test: (p) => p.startsWith("/admin/reports"), titleKey: "routeTitles.reports" },
  { test: (p) => p.startsWith("/admin/exports"), titleKey: "routeTitles.exports" },
  { test: (p) => p.startsWith("/admin/audit-logs"), titleKey: "routeTitles.auditLogs" },
  { test: (p) => p.startsWith("/admin/data-retention"), titleKey: "routeTitles.dataRetention" },
  { test: (p) => p.startsWith("/admin/backups"), titleKey: "routeTitles.dataSafety" },
  { test: (p) => p.startsWith("/admin/recycle-bin"), titleKey: "routeTitles.recycleBin" },
  { test: (p) => p.startsWith("/admin/notifications"), titleKey: "routeTitles.notifications" },
  { test: (p) => p.startsWith("/admin/event-center"), titleKey: "routeTitles.eventCenter" },
  { test: (p) => p.startsWith("/admin/monitoring"), titleKey: "routeTitles.monitoring" },
];

export const ADMIN_ROUTE_ACCESS_RULES: AdminRouteAccessRule[] = [
  { test: (p) => p === "/admin" || p === "/admin/", rule: one("dashboard.view") },
  { test: (p) => p.startsWith("/admin/dashboard"), rule: one("dashboard.view") },
  { test: (p) => p.startsWith("/admin/categories"), rule: one("category.manage") },
  { test: (p) => p.startsWith("/admin/tags"), rule: one("tag.manage") },
  { test: (p) => p.startsWith("/admin/products"), rule: one("product.view") },
  { test: (p) => p.startsWith("/admin/inventory"), rule: one("inventory.manage") },
  { test: (p) => p.startsWith("/admin/replenishment"), rule: one("inventory.manage") },
  { test: (p) => p.startsWith("/admin/orders"), rule: one("order.view") },
  { test: (p) => p.startsWith("/admin/payments"), rule: one("payment.manage") },
  { test: (p) => p.startsWith("/admin/returns"), rule: one("return.view") },
  { test: (p) => p.startsWith("/admin/reviews"), rule: any(["review.view", "review.manage"]) },
  { test: (p) => p.startsWith("/admin/feedback"), rule: one("user.view") },
  { test: (p) => p.startsWith("/admin/user-security"), rule: any(["user.view", "event.view", "event.manage"]) },
  { test: (p) => p.startsWith("/admin/users"), rule: one("user.view") },
  { test: (p) => p.startsWith("/admin/member-levels"), rule: one("member_level.manage") },
  { test: (p) => p.startsWith("/admin/invites"), rule: one("invite.view") },
  { test: (p) => p.startsWith("/admin/rewards"), rule: one("referral.manage") },
  { test: (p) => p.startsWith("/admin/points/records"), rule: one("points.manage") },
  { test: (p) => p.startsWith("/admin/settings/points"), rule: one("points.manage") },
  { test: (p) => p.startsWith("/admin/settings/referral"), rule: one("referral.manage") },
  { test: (p) => p.startsWith("/admin/settings/features"), rule: one("settings.manage") },
  { test: (p) => p.startsWith("/admin/settings/site"), rule: one("settings.manage") },
  { test: (p) => p.startsWith("/admin/settings/telegram"), rule: one("settings.manage") },
  { test: (p) => p.startsWith("/admin/settings/theme"), rule: one("settings.manage") },
  { test: (p) => p.startsWith("/admin/settings/shipping"), rule: one("shipping.manage") },
  { test: (p) => p.startsWith("/admin/settings/roles"), rule: one("role.manage") },
  { test: (p) => p.startsWith("/admin/accounts"), rule: one("role.manage") },
  { test: (p) => p.startsWith("/admin/data-retention"), rule: any(["data_cleanup.view", "data_cleanup.manage", "data_cleanup.execute"]) },
  { test: (p) => p.startsWith("/admin/backups"), rule: one("backup.view") },
  { test: (p) => p.startsWith("/admin/recycle-bin"), rule: one("recycle_bin.manage") },
  { test: (p) => p.startsWith("/admin/coupons"), rule: one("coupon.view") },
  { test: (p) => p.startsWith("/admin/marketing/activities"), rule: one("activity.manage") },
  { test: (p) => p.startsWith("/admin/marketing/coupon-campaigns"), rule: one("coupon.view") },
  { test: (p) => p.startsWith("/admin/marketing/coupons"), rule: one("coupon.view") },
  { test: (p) => p.startsWith("/admin/marketing/points"), rule: one("points.manage") },
  { test: (p) => p.startsWith("/admin/marketing/rewards"), rule: one("referral.manage") },
  { test: (p) => p.startsWith("/admin/marketing/invites"), rule: one("invite.view") },
  { test: (p) => p === "/admin/marketing" || p.startsWith("/admin/marketing"), rule: any(["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"]) },
  { test: (p) => p.startsWith("/admin/notifications"), rule: any(["notification.view", "notification.manage"]) },
  { test: (p) => p.startsWith("/admin/event-center"), rule: any(["event.view", "event.manage"]) },
  { test: (p) => p.startsWith("/admin/monitoring"), rule: any(["monitoring.view", "monitoring.manage", "monitoring.repair"]) },
  { test: (p) => p.startsWith("/admin/account"), rule: one("dashboard.view") },
  { test: (p) => p.startsWith("/admin/banners"), rule: one("banner.manage") },
  { test: (p) => p.startsWith("/admin/support-download"), rule: one("settings.manage") },
  { test: (p) => p.startsWith("/admin/home-ops"), rule: one("home_ops.manage") },
  { test: (p) => p.startsWith("/admin/reports"), rule: one("report.view") },
  { test: (p) => p.startsWith("/admin/exports"), rule: one("report.export") },
  { test: (p) => p.startsWith("/admin/audit-logs"), rule: one("audit.view") },
  { test: (p) => p.startsWith("/admin/content"), rule: one("content.manage") },
];

export const ADMIN_ROUTE_FALLBACKS: Array<{ path: string; rule: PathRule }> = [
  { path: "/admin", rule: one("dashboard.view") },
  { path: "/admin/orders", rule: one("order.view") },
  { path: "/admin/products", rule: one("product.view") },
  { path: "/admin/categories", rule: one("category.manage") },
  { path: "/admin/tags", rule: one("tag.manage") },
  { path: "/admin/users", rule: one("user.view") },
  { path: "/admin/marketing", rule: any(["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"]) },
  { path: "/admin/accounts", rule: one("role.manage") },
  { path: "/admin/account", rule: one("dashboard.view") },
];

export function getAdminRouteDocumentTitleKey(pathname: string): string {
  return ADMIN_ROUTE_TITLE_RULES.find((item) => item.test(pathname))?.titleKey ?? "routeTitles.admin";
}

export function getAdminRouteAccessRule(pathname: string): PathRule | null {
  return ADMIN_ROUTE_ACCESS_RULES.find((item) => item.test(pathname))?.rule ?? null;
}

export function canPassAdminPathRule(
  rule: PathRule,
  can: (code: string) => boolean,
  canAny: (codes: string[]) => boolean = (codes) => codes.some(can),
): boolean {
  return rule.kind === "one" ? can(rule.permission) : canAny(rule.permissions);
}

export function getFirstAllowedAdminRoutePath(
  can: (code: string) => boolean,
  canAny: (codes: string[]) => boolean = (codes) => codes.some(can),
): string {
  for (const { path, rule } of ADMIN_ROUTE_FALLBACKS) {
    if (canPassAdminPathRule(rule, can, canAny)) return path;
  }
  return "/admin/account";
}

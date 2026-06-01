/**
 * 与后台路由对应的权限码，用于侧栏过滤与无权限路径重定向
 */
export type PathRule =
  | { kind: "one"; permission: string }
  | { kind: "any"; permissions: string[] };

const RULES: { test: (path: string) => boolean; rule: PathRule }[] = [
  { test: (p) => p === "/admin" || p === "/admin/", rule: { kind: "one", permission: "dashboard.view" } },
  { test: (p) => p.startsWith("/admin/dashboard"), rule: { kind: "one", permission: "dashboard.view" } },
  { test: (p) => p.startsWith("/admin/categories"), rule: { kind: "one", permission: "category.manage" } },
  { test: (p) => p.startsWith("/admin/tags"), rule: { kind: "one", permission: "tag.manage" } },
  { test: (p) => p.startsWith("/admin/products"), rule: { kind: "one", permission: "product.view" } },
  { test: (p) => p.startsWith("/admin/inventory"), rule: { kind: "one", permission: "inventory.manage" } },
  { test: (p) => p.startsWith("/admin/replenishment"), rule: { kind: "one", permission: "inventory.manage" } },
  { test: (p) => p.startsWith("/admin/orders"), rule: { kind: "one", permission: "order.view" } },
  { test: (p) => p.startsWith("/admin/payments"), rule: { kind: "one", permission: "payment.manage" } },
  { test: (p) => p.startsWith("/admin/returns"), rule: { kind: "one", permission: "return.view" } },
  { test: (p) => p.startsWith("/admin/reviews"), rule: { kind: "any", permissions: ["review.view", "review.manage"] } },
  { test: (p) => p.startsWith("/admin/user-security"), rule: { kind: "any", permissions: ["user.view", "event.view", "event.manage"] } },
  { test: (p) => p.startsWith("/admin/users"), rule: { kind: "one", permission: "user.view" } },
  { test: (p) => p.startsWith("/admin/member-levels"), rule: { kind: "one", permission: "member_level.manage" } },
  { test: (p) => p.startsWith("/admin/invites"), rule: { kind: "one", permission: "invite.view" } },
  { test: (p) => p.startsWith("/admin/rewards"), rule: { kind: "one", permission: "referral.manage" } },
  { test: (p) => p.startsWith("/admin/points/records"), rule: { kind: "one", permission: "points.manage" } },
  { test: (p) => p.startsWith("/admin/settings/points"), rule: { kind: "one", permission: "points.manage" } },
  { test: (p) => p.startsWith("/admin/settings/referral"), rule: { kind: "one", permission: "referral.manage" } },
  { test: (p) => p.startsWith("/admin/settings/features"), rule: { kind: "one", permission: "settings.manage" } },
  { test: (p) => p.startsWith("/admin/settings/site"), rule: { kind: "one", permission: "settings.manage" } },
  { test: (p) => p.startsWith("/admin/settings/telegram"), rule: { kind: "one", permission: "settings.manage" } },
  { test: (p) => p.startsWith("/admin/settings/theme"), rule: { kind: "one", permission: "settings.manage" } },
  { test: (p) => p.startsWith("/admin/settings/shipping"), rule: { kind: "one", permission: "shipping.manage" } },
  { test: (p) => p.startsWith("/admin/settings/roles"), rule: { kind: "one", permission: "role.manage" } },
  { test: (p) => p.startsWith("/admin/accounts"), rule: { kind: "one", permission: "role.manage" } },
  { test: (p) => p.startsWith("/admin/data-retention"), rule: { kind: "any", permissions: ["data_cleanup.view", "data_cleanup.manage", "data_cleanup.execute"] } },
  { test: (p) => p.startsWith("/admin/backups"), rule: { kind: "one", permission: "backup.view" } },
  { test: (p) => p.startsWith("/admin/recycle-bin"), rule: { kind: "one", permission: "recycle_bin.manage" } },
  { test: (p) => p.startsWith("/admin/coupons"), rule: { kind: "one", permission: "coupon.view" } },
  { test: (p) => p.startsWith("/admin/marketing/activities"), rule: { kind: "one", permission: "activity.manage" } },
  { test: (p) => p.startsWith("/admin/marketing/coupon-campaigns"), rule: { kind: "one", permission: "coupon.view" } },
  { test: (p) => p.startsWith("/admin/marketing/coupons"), rule: { kind: "one", permission: "coupon.view" } },
  { test: (p) => p.startsWith("/admin/marketing/points"), rule: { kind: "one", permission: "points.manage" } },
  { test: (p) => p.startsWith("/admin/marketing/rewards"), rule: { kind: "one", permission: "referral.manage" } },
  { test: (p) => p.startsWith("/admin/marketing/invites"), rule: { kind: "one", permission: "invite.view" } },
  { test: (p) => p === "/admin/marketing" || p.startsWith("/admin/marketing"), rule: { kind: "any", permissions: ["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"] } },
  { test: (p) => p.startsWith("/admin/notifications"), rule: { kind: "any", permissions: ["notification.view", "notification.manage"] } },
  { test: (p) => p.startsWith("/admin/event-center"), rule: { kind: "any", permissions: ["event.view", "event.manage"] } },
  { test: (p) => p.startsWith("/admin/monitoring"), rule: { kind: "any", permissions: ["monitoring.view", "monitoring.manage", "monitoring.repair"] } },
  { test: (p) => p.startsWith("/admin/account"), rule: { kind: "one", permission: "dashboard.view" } },
  { test: (p) => p.startsWith("/admin/banners"), rule: { kind: "one", permission: "banner.manage" } },
  { test: (p) => p.startsWith("/admin/support-download"), rule: { kind: "one", permission: "settings.manage" } },
  { test: (p) => p.startsWith("/admin/home-ops"), rule: { kind: "one", permission: "home_ops.manage" } },
  { test: (p) => p.startsWith("/admin/reports"), rule: { kind: "one", permission: "report.view" } },
  { test: (p) => p.startsWith("/admin/exports"), rule: { kind: "one", permission: "report.export" } },
  { test: (p) => p.startsWith("/admin/audit-logs"), rule: { kind: "one", permission: "audit.view" } },
  { test: (p) => p.startsWith("/admin/content"), rule: { kind: "one", permission: "content.manage" } },
];

export function getPathAccessRule(pathname: string): PathRule | null {
  const hit = RULES.find((r) => r.test(pathname));
  return hit ? hit.rule : null;
}

export function hasAdminPathAccessRule(pathname: string): boolean {
  return getPathAccessRule(pathname) !== null;
}

/** 侧栏顺序：首个有权限的入口 */
const FALLBACK_PATHS: { path: string; rule: PathRule }[] = [
  { path: "/admin", rule: { kind: "one", permission: "dashboard.view" } },
  { path: "/admin/orders", rule: { kind: "one", permission: "order.view" } },
  { path: "/admin/products", rule: { kind: "one", permission: "product.view" } },
  { path: "/admin/categories", rule: { kind: "one", permission: "category.manage" } },
  { path: "/admin/tags", rule: { kind: "one", permission: "tag.manage" } },
  { path: "/admin/users", rule: { kind: "one", permission: "user.view" } },
  { path: "/admin/marketing", rule: { kind: "any", permissions: ["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"] } },
  { path: "/admin/accounts", rule: { kind: "one", permission: "role.manage" } },
  { path: "/admin/account", rule: { kind: "one", permission: "dashboard.view" } },
];

export function getFirstAllowedAdminPath(
  can: (c: string) => boolean,
  canAny: (codes: string[]) => boolean = (codes) => codes.some(can),
): string {
  for (const { path, rule } of FALLBACK_PATHS) {
    if (rule.kind === "one" ? can(rule.permission) : canAny(rule.permissions)) return path;
  }
  return "/admin/account";
}

export function canAccessAdminPath(
  pathname: string,
  can: (c: string) => boolean,
  canAny: (codes: string[]) => boolean,
): boolean {
  const rule = getPathAccessRule(pathname);
  if (!rule) return false;
  if (rule.kind === "one") return can(rule.permission);
  return canAny(rule.permissions);
}

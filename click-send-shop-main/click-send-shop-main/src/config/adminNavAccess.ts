/**
 * 与后台路由对应的权限码，用于侧栏过滤与无权限路径重定向
 */
export type PathRule =
  | { kind: "one"; permission: string }
  | { kind: "any"; permissions: string[] };

const RULES: { test: (path: string) => boolean; rule: PathRule }[] = [
  { test: (p) => p === "/admin" || p === "/admin/", rule: { kind: "one", permission: "dashboard.view" } },
  {
    test: (p) =>
      p.startsWith("/admin/products") || p.startsWith("/admin/categories") || p.startsWith("/admin/tags"),
    rule: { kind: "one", permission: "product.view" },
  },
  { test: (p) => p.startsWith("/admin/orders"), rule: { kind: "one", permission: "order.view" } },
  { test: (p) => p.startsWith("/admin/returns"), rule: { kind: "one", permission: "return.view" } },
  { test: (p) => p.startsWith("/admin/reviews"), rule: { kind: "one", permission: "review.manage" } },
  { test: (p) => p.startsWith("/admin/users"), rule: { kind: "one", permission: "user.view" } },
  { test: (p) => p.startsWith("/admin/invites"), rule: { kind: "one", permission: "invite.view" } },
  { test: (p) => p.startsWith("/admin/settings/points"), rule: { kind: "one", permission: "points.manage" } },
  { test: (p) => p.startsWith("/admin/settings/referral"), rule: { kind: "one", permission: "referral.manage" } },
  { test: (p) => p.startsWith("/admin/settings/site"), rule: { kind: "one", permission: "settings.manage" } },
  { test: (p) => p.startsWith("/admin/settings/theme"), rule: { kind: "one", permission: "settings.manage" } },
  { test: (p) => p.startsWith("/admin/settings/shipping"), rule: { kind: "one", permission: "shipping.manage" } },
  { test: (p) => p.startsWith("/admin/settings/roles"), rule: { kind: "one", permission: "role.manage" } },
  { test: (p) => p.startsWith("/admin/accounts"), rule: { kind: "one", permission: "role.manage" } },
  { test: (p) => p.startsWith("/admin/recycle-bin"), rule: { kind: "one", permission: "recycle_bin.manage" } },
  { test: (p) => p.startsWith("/admin/coupons"), rule: { kind: "one", permission: "coupon.view" } },
  { test: (p) => p.startsWith("/admin/notifications"), rule: { kind: "one", permission: "notification.manage" } },
  { test: (p) => p.startsWith("/admin/account"), rule: { kind: "one", permission: "dashboard.view" } },
  { test: (p) => p.startsWith("/admin/banners"), rule: { kind: "one", permission: "banner.manage" } },
  { test: (p) => p.startsWith("/admin/reports"), rule: { kind: "one", permission: "report.view" } },
  { test: (p) => p.startsWith("/admin/exports"), rule: { kind: "one", permission: "report.export" } },
  {
    test: (p) => p.startsWith("/admin/logs"),
    rule: { kind: "any", permissions: ["audit.view", "admin_log.view"] },
  },
  { test: (p) => p.startsWith("/admin/content"), rule: { kind: "one", permission: "content.manage" } },
];

export function getPathAccessRule(pathname: string): PathRule | null {
  const hit = RULES.find((r) => r.test(pathname));
  return hit ? hit.rule : null;
}

/** 侧栏顺序：首个有权限的入口 */
const FALLBACK_PATHS: { path: string; permission: string }[] = [
  { path: "/admin", permission: "dashboard.view" },
  { path: "/admin/orders", permission: "order.view" },
  { path: "/admin/products", permission: "product.view" },
  { path: "/admin/users", permission: "user.view" },
  { path: "/admin/account", permission: "dashboard.view" },
];

export function getFirstAllowedAdminPath(
  can: (c: string) => boolean,
): string {
  for (const { path, permission } of FALLBACK_PATHS) {
    if (can(permission)) return path;
  }
  return "/admin/account";
}

export function canAccessAdminPath(
  pathname: string,
  can: (c: string) => boolean,
  canAny: (codes: string[]) => boolean,
): boolean {
  const rule = getPathAccessRule(pathname);
  if (!rule) return true;
  if (rule.kind === "one") return can(rule.permission);
  return canAny(rule.permissions);
}

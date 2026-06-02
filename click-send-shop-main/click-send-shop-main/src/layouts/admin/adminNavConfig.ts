import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Link2,
  Star,
  Ticket,
  Settings,
  Bell,
  Megaphone,
  Search,
  Paintbrush,
  FolderTree,
  Tags,
  ClipboardList,
  Gift,
  RotateCcw,
  Image,
  BarChart3,
  FileText,
  ScrollText,
  Truck,
  UserCog,
  LayoutGrid,
  Shield,
  MessageSquareMore,
  Palette,
  CreditCard,
  Crown,
  Headphones,
  AlertTriangle,
  Database,
  DatabaseBackup,
  MousePointerClick,
} from "lucide-react";
import { REPORT_REGISTRY, type ReportGroup } from "@/modules/admin/pages/report/reportRegistry";
import type { SiteCapabilities } from "@/types/siteCapabilities";

export type NavPerm = string | { anyOf: string[] };

export interface NavChild {
  icon?: LucideIcon;
  labelKey?: string;
  label?: string;
  path?: string;
  permission?: NavPerm;
  /** 站点功能开关；关闭时不展示该子菜单项 */
  capability?: keyof SiteCapabilities;
  children?: NavChild[];
}

export interface NavItem {
  icon: LucideIcon;
  labelKey?: string;
  label?: string;
  path: string;
  permission?: NavPerm;
  capability?: keyof SiteCapabilities;
  children?: NavChild[];
}

export type ResolvedNavChild = NavChild & { label: string; children?: ResolvedNavChild[] };
export type ResolvedNavItem = Omit<NavItem, "children"> & { label: string; children?: ResolvedNavChild[] };

export const localNavLabels: Record<string, string> = {
  "nav.eventCenter": "后台事件",
  "nav.monitoringCenter": "监控中心",
  "nav.monitoringOverview": "数据总览",
  "nav.monitoringAnomalies": "数据异常",
  "nav.monitoringRepairTasks": "修复任务",
  "nav.monitoringRules": "监控规则",
  "nav.monitoringRuns": "运行记录",
  "nav.dataRetention": "数据保存与清理中心",
  "nav.reportSalesProfitGroup": "销售与利润",
  "nav.reportProductInventoryGroup": "商品与库存",
  "nav.reportOrderCustomerGroup": "订单与客户",
  "nav.reportMarketingGroup": "营销分析",
  "nav.reportTrafficSearchGroup": "流量与搜索",
};

export function resolveNavLabel(t: (key: string) => string, key?: string, label?: string) {
  if (label) return label;
  if (!key) return "";
  if (key === "nav.backupCenter") return "备份与恢复";
  const translated = t(key);
  return translated === key ? localNavLabels[key] || key : translated;
}

export const REPORT_NAV_ICON_BY_KEY: Record<string, LucideIcon> = {
  overview: LayoutDashboard,
  sales_daily: BarChart3,
  sales_monthly: BarChart3,
  profit_daily: BarChart3,
  profit_monthly: BarChart3,
  operating_expenses: ClipboardList,
  product_analysis: Package,
  category_analysis: FolderTree,
  inventory_analysis: Package,
  order_analysis: ShoppingCart,
  customer_analysis: Users,
  activity_analysis: Megaphone,
  coupon_analysis: Ticket,
  search_analysis: Search,
  traffic_analysis: MousePointerClick,
};

export const REPORT_GROUP_LABEL_KEY: Partial<Record<ReportGroup, string>> = {
  "销售与利润": "nav.reportSalesProfitGroup",
  "商品与库存": "nav.reportProductInventoryGroup",
  "订单与客户": "nav.reportOrderCustomerGroup",
  "营销分析": "nav.reportMarketingGroup",
  "流量与搜索": "nav.reportTrafficSearchGroup",
};

export function buildDataCenterNavChildren(): NavChild[] {
  const directKeys = new Set(["overview"]);
  const children: NavChild[] = REPORT_REGISTRY
    .filter((report) => directKeys.has(report.key))
    .map((report) => ({
      icon: REPORT_NAV_ICON_BY_KEY[report.key] ?? BarChart3,
      label: report.title,
      path: report.routePath,
      permission: report.permission,
      capability: report.capability,
    }));

  const groupedReports = REPORT_REGISTRY.filter((report) => !directKeys.has(report.key) && report.group !== "数据导出");
  const groups: ReportGroup[] = ["销售与利润", "商品与库存", "订单与客户", "营销分析", "流量与搜索"];
  for (const group of groups) {
    const reports = groupedReports.filter((report) => report.group === group);
    if (reports.length === 0) continue;
    children.push({
      icon: BarChart3,
      labelKey: REPORT_GROUP_LABEL_KEY[group],
      path: reports[0].routePath,
      permission: "report.view",
      children: reports.map((report) => ({
        icon: REPORT_NAV_ICON_BY_KEY[report.key] ?? BarChart3,
        label: report.title,
        path: report.routePath,
        permission: report.permission,
        capability: report.capability,
      })),
    });
  }

  children.push({
    icon: FileText,
    labelKey: "nav.exports",
    path: "/admin/exports",
    permission: "report.export",
  });
  return children;
}

export const navItemsRaw: NavItem[] = [
  { icon: LayoutDashboard, labelKey: "nav.dashboard", path: "/admin", permission: "dashboard.view" },
  {
    icon: Package,
    labelKey: "nav.productCenter",
    path: "/admin/products",
    permission: { anyOf: ["product.view", "category.manage", "tag.manage", "inventory.manage"] },
    children: [
      { icon: Package, labelKey: "nav.productManage", path: "/admin/products", permission: "product.view" },
      { icon: FolderTree, labelKey: "nav.categories", path: "/admin/categories", permission: "category.manage" },
      { icon: Package, labelKey: "nav.inventory", path: "/admin/inventory", permission: "inventory.manage", capability: "inventoryEnabled" },
      { icon: ClipboardList, label: "智能补货", path: "/admin/replenishment", permission: "inventory.manage", capability: "inventoryEnabled" },
      { icon: Tags, labelKey: "nav.tags", path: "/admin/tags", permission: "tag.manage" },
    ],
  },
  {
    icon: ShoppingCart,
    labelKey: "nav.orderCenter",
    path: "/admin/orders",
    permission: "order.view",
    children: [
      { icon: ShoppingCart, labelKey: "nav.orderManage", path: "/admin/orders", permission: "order.view" },
      { icon: ClipboardList, labelKey: "nav.unfinishedCheckout", path: "/admin/orders/unfinished", permission: "order.view" },
    ],
  },
  {
    icon: CreditCard,
    labelKey: "nav.paymentCenter",
    path: "/admin/payments/channels",
    permission: "payment.manage",
    capability: "onlinePaymentEnabled",
    children: [
      { icon: CreditCard, labelKey: "nav.paymentChannels", path: "/admin/payments/channels", permission: "payment.manage", capability: "onlinePaymentEnabled" },
      { icon: ClipboardList, labelKey: "nav.paymentOrders", path: "/admin/payments/orders", permission: "payment.manage", capability: "onlinePaymentEnabled" },
      { icon: ScrollText, labelKey: "nav.paymentEvents", path: "/admin/payments/events", permission: "payment.manage", capability: "onlinePaymentEnabled" },
      { icon: BarChart3, labelKey: "nav.paymentReconciliations", path: "/admin/payments/reconciliations", permission: "payment.manage", capability: "onlinePaymentEnabled" },
    ],
  },
  {
    icon: RotateCcw,
    labelKey: "nav.afterSaleCenter",
    path: "/admin/returns",
    permission: "return.view",
    children: [
      { icon: RotateCcw, labelKey: "nav.returns", path: "/admin/returns", permission: "return.view" },
    ],
  },
  {
    icon: Users,
    labelKey: "nav.customerCenter",
    path: "/admin/users",
    permission: { anyOf: ["user.view", "member_level.manage", "review.view", "review.manage", "event.view", "event.manage"] },
    children: [
      { icon: Users, labelKey: "nav.userManage", path: "/admin/users", permission: "user.view" },
      { icon: Shield, label: "用户安全", path: "/admin/user-security", permission: { anyOf: ["user.view", "event.view", "event.manage"] } },
      { icon: Crown, labelKey: "nav.memberLevels", path: "/admin/member-levels", permission: "member_level.manage", capability: "memberLevelEnabled" },
      { icon: MessageSquareMore, labelKey: "nav.reviews", path: "/admin/reviews", permission: { anyOf: ["review.view", "review.manage"] }, capability: "reviewEnabled" },
    ],
  },
  {
    icon: Megaphone,
    labelKey: "nav.marketingCenter",
    path: "/admin/marketing",
    permission: { anyOf: ["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"] },
    children: [
      { icon: LayoutGrid, labelKey: "nav.marketingOverview", path: "/admin/marketing", permission: { anyOf: ["activity.manage", "coupon.view", "points.manage", "referral.manage", "invite.view"] } },
      { icon: Megaphone, labelKey: "nav.activities", path: "/admin/marketing/activities", permission: "activity.manage" },
      { icon: Ticket, labelKey: "nav.coupons", path: "/admin/marketing/coupons", permission: "coupon.view", capability: "couponEnabled" },
      { icon: Gift, label: "优惠券活动", path: "/admin/marketing/coupon-campaigns", permission: "coupon.view", capability: "couponEnabled" },
      { icon: ClipboardList, labelKey: "nav.couponRecords", path: "/admin/marketing/coupons/records", permission: "coupon.view", capability: "couponEnabled" },
      { icon: Star, labelKey: "nav.points", path: "/admin/marketing/points", permission: "points.manage", capability: "pointsEnabled" },
      { icon: Gift, labelKey: "nav.rewards", path: "/admin/marketing/rewards", permission: "referral.manage" },
      { icon: Link2, labelKey: "nav.invites", path: "/admin/marketing/invites", permission: "invite.view" },
    ],
  },
  {
    icon: Paintbrush,
    labelKey: "nav.designCenter",
    path: "/admin/home-ops",
    permission: { anyOf: ["home_ops.manage", "banner.manage", "settings.manage", "content.manage"] },
    children: [
      { icon: LayoutGrid, labelKey: "nav.homeDesign", path: "/admin/home-ops", permission: "home_ops.manage" },
      { icon: Image, labelKey: "nav.banners", path: "/admin/banners", permission: "banner.manage" },
      { icon: Headphones, labelKey: "nav.supportDownload", path: "/admin/support-download", permission: "settings.manage", capability: "customerServiceDownloadEnabled" },
      { icon: Palette, labelKey: "nav.themeSettings", path: "/admin/settings/theme", permission: "settings.manage" },
      { icon: FileText, labelKey: "nav.content", path: "/admin/content", permission: "content.manage" },
    ],
  },
  {
    icon: Bell,
    labelKey: "nav.notificationCenter",
    path: "/admin/notifications",
    permission: { anyOf: ["notification.view", "notification.manage", "event.view", "event.manage"] },
    children: [
      { icon: AlertTriangle, labelKey: "nav.eventCenter", path: "/admin/event-center", permission: { anyOf: ["event.view", "event.manage"] } },
      { icon: Bell, labelKey: "nav.notifications", path: "/admin/notifications", permission: { anyOf: ["notification.view", "notification.manage"] } },
    ],
  },
  {
    icon: Shield,
    labelKey: "nav.monitoringCenter",
    path: "/admin/monitoring",
    permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] },
    children: [
      { icon: LayoutDashboard, labelKey: "nav.monitoringOverview", path: "/admin/monitoring", permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] } },
      { icon: Shield, labelKey: "nav.monitoringAnomalies", path: "/admin/monitoring/anomalies", permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] } },
      { icon: RotateCcw, labelKey: "nav.monitoringRepairTasks", path: "/admin/monitoring/repair-tasks", permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] } },
      { icon: Settings, labelKey: "nav.monitoringRules", path: "/admin/monitoring/rules", permission: { anyOf: ["monitoring.view", "monitoring.manage"] } },
      { icon: ScrollText, labelKey: "nav.monitoringRuns", path: "/admin/monitoring/runs", permission: { anyOf: ["monitoring.view", "monitoring.manage", "monitoring.repair"] } },
    ],
  },
  {
    icon: BarChart3,
    labelKey: "nav.dataCenter",
    path: "/admin/reports/overview",
    permission: { anyOf: ["report.view", "report.export"] },
    children: buildDataCenterNavChildren(),
  },
  {
    icon: UserCog,
    labelKey: "nav.staffCenter",
    path: "/admin/accounts",
    permission: "role.manage",
    children: [
      { icon: UserCog, labelKey: "nav.staffAccounts", path: "/admin/accounts", permission: "role.manage" },
      { icon: Shield, labelKey: "nav.roles", path: "/admin/settings/roles", permission: "role.manage" },
    ],
  },
  {
    icon: Settings,
    labelKey: "nav.settings",
    path: "/admin/settings/site",
    children: [
      { icon: Settings, labelKey: "nav.siteSettings", path: "/admin/settings/site", permission: "settings.manage" },
      { icon: Settings, labelKey: "nav.featureSettings", path: "/admin/settings/features", permission: "settings.manage" },
      {
        icon: Bell,
        labelKey: "nav.telegramNotifications",
        path: "/admin/settings/telegram",
        permission: "settings.manage",
        capability: "telegramOrderNotifyEnabled",
      },
      { icon: Truck, labelKey: "nav.shipping", path: "/admin/settings/shipping", permission: "shipping.manage", capability: "shippingEnabled" },
      { icon: ScrollText, labelKey: "nav.auditLogs", path: "/admin/audit-logs", permission: "audit.view" },
      { icon: Database, labelKey: "nav.dataRetention", path: "/admin/data-retention", permission: { anyOf: ["data_cleanup.view", "data_cleanup.manage", "data_cleanup.execute"] } },
      { icon: DatabaseBackup, labelKey: "nav.backupCenter", path: "/admin/backups", permission: "backup.view" },
      { icon: RotateCcw, labelKey: "nav.recycleBin", path: "/admin/recycle-bin", permission: "recycle_bin.manage" },
    ],
  },
];

export function resolveNavLabels(items: NavItem[], t: (key: string) => string): ResolvedNavItem[] {
  const resolveChildren = (children?: NavChild[]): ResolvedNavChild[] | undefined =>
    children?.map((c) => ({
      ...c,
      label: resolveNavLabel(t, c.labelKey, c.label),
      children: resolveChildren(c.children),
    }));

  return items.map((item) => ({
    ...item,
    label: resolveNavLabel(t, item.labelKey, item.label),
    children: resolveChildren(item.children),
  }));
}

export function passNavPerm(
  p: NavPerm | undefined,
  can: (c: string) => boolean,
  canAny: (a: string[]) => boolean,
): boolean {
  if (p === undefined) return true;
  if (typeof p === "string") return can(p);
  return canAny(p.anyOf);
}

export function passesNavCapability(
  capability: keyof SiteCapabilities | undefined,
  capabilities: SiteCapabilities,
): boolean {
  if (capability === undefined) return true;
  return capabilities[capability];
}

export function filterNav(
  items: NavItem[],
  can: (c: string) => boolean,
  canAny: (a: string[]) => boolean,
  capabilities: SiteCapabilities,
): NavItem[] {
  const filterChildren = (children: NavChild[]): NavChild[] => {
    const out: NavChild[] = [];
    for (const child of children) {
      if (!passesNavCapability(child.capability, capabilities)) continue;
      const nested = child.children?.length ? filterChildren(child.children) : undefined;
      if (child.children?.length) {
        if (!nested?.length) continue;
        if (child.permission !== undefined && !passNavPerm(child.permission, can, canAny)) continue;
        out.push({ ...child, children: nested });
        continue;
      }
      if (!passNavPerm(child.permission, can, canAny)) continue;
      out.push(child);
    }
    return out;
  };

  const out: NavItem[] = [];
  for (const item of items) {
    if (!passesNavCapability(item.capability, capabilities)) continue;
    if (item.children?.length) {
      const children = filterChildren(item.children);
      if (children.length === 0) continue;
      if (item.permission !== undefined && !passNavPerm(item.permission, can, canAny)) continue;
      out.push({ ...item, children });
      continue;
    }
    if (!passNavPerm(item.permission, can, canAny)) continue;
    out.push(item);
  }
  return out;
}

/** 底部主导航四入口 +「更多」侧栏，与移动端拇指热区一致 */
export type AdminMobileTabKey = "dash" | "products" | "orders" | "notifications" | "more";

export function mobileBottomTab(pathname: string): AdminMobileTabKey {
  if (pathname === "/admin" || pathname === "/admin/") return "dash";
  if (
    pathname.startsWith("/admin/products") ||
    pathname.startsWith("/admin/categories") ||
    pathname.startsWith("/admin/tags") ||
    pathname.startsWith("/admin/inventory")
  ) {
    return "products";
  }
  if (pathname.startsWith("/admin/orders")) return "orders";
  if (pathname.startsWith("/admin/notifications")) return "notifications";
  return "more";
}

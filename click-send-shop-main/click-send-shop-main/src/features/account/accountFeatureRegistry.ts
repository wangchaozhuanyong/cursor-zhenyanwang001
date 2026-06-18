import type { LucideIcon } from "lucide-react";
import {
  Bell,
  CircleHelp,
  Clock3,
  Coins,
  Headphones,
  Info,
  MapPin,
  MessageSquare,
  Package,
  Settings,
  Smartphone,
  Star,
  Ticket,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import type { LoyaltyConfig } from "@/services/loyaltyService";
import type { SiteCapabilities } from "@/types/siteCapabilities";
import { isLoyaltyFeatureEnabled, type LoyaltyFeature } from "@/utils/loyaltyFeatureVisibility";

export type AccountFeatureKey =
  | "profile"
  | "editProfile"
  | "orders"
  | "orderPendingPayment"
  | "orderPaid"
  | "orderShipped"
  | "orderPendingReview"
  | "orderAfterSale"
  | "returns"
  | "address"
  | "coupons"
  | "points"
  | "rewards"
  | "wallet"
  | "invite"
  | "favorites"
  | "history"
  | "notifications"
  | "feedback"
  | "settings"
  | "memberBenefits"
  | "support"
  | "install"
  | "help"
  | "about";

export type AccountFeatureGroup =
  | "assets"
  | "orders"
  | "services"
  | "secondary"
  | "desktopNav"
  | "hero";

export type AccountFeatureViewport = "mobile" | "tablet" | "desktop";

export type AccountFeatureContext = {
  capabilities: SiteCapabilities;
  loyaltyConfig?: LoyaltyConfig | null;
  supportPath?: string;
  notificationBadgeText?: string;
  values?: Partial<Record<AccountFeatureKey, string>>;
  counts?: Partial<Record<AccountFeatureKey, number>>;
};

export type AccountFeatureItem = {
  key: AccountFeatureKey;
  label: string;
  path: string;
  icon: LucideIcon;
  requireAuth?: boolean;
  capability?: keyof SiteCapabilities;
  loyaltyFeature?: LoyaltyFeature;
  group: AccountFeatureGroup;
  visibleOn: AccountFeatureViewport[];
  disabledReason?: string;
  enabled?: (ctx: AccountFeatureContext) => boolean;
};

const ALL_VIEWPORTS: AccountFeatureViewport[] = ["mobile", "tablet", "desktop"];

export const ACCOUNT_FEATURE_REGISTRY: AccountFeatureItem[] = [
  { key: "profile", label: "个人概览", path: "/profile", icon: User, group: "desktopNav", visibleOn: ALL_VIEWPORTS },
  { key: "editProfile", label: "修改资料", path: "/settings", icon: User, requireAuth: true, group: "services", visibleOn: ALL_VIEWPORTS },
  { key: "orders", label: "我的订单", path: "/orders", icon: Package, requireAuth: true, group: "desktopNav", visibleOn: ALL_VIEWPORTS },
  { key: "orderPendingPayment", label: "待付款", path: "/orders?tab=pending_payment", icon: Wallet, requireAuth: true, group: "orders", visibleOn: ALL_VIEWPORTS },
  { key: "orderPaid", label: "待发货", path: "/orders?tab=paid", icon: Package, requireAuth: true, group: "orders", visibleOn: ALL_VIEWPORTS },
  { key: "orderShipped", label: "待收货", path: "/orders?tab=shipped", icon: Truck, requireAuth: true, group: "orders", visibleOn: ALL_VIEWPORTS },
  { key: "orderPendingReview", label: "待评价", path: "/orders?tab=pending_review", icon: MessageSquare, requireAuth: true, capability: "reviewEnabled", group: "orders", visibleOn: ALL_VIEWPORTS },
  { key: "orderAfterSale", label: "退款/售后", path: "/orders?tab=after_sale", icon: CircleHelp, requireAuth: true, group: "orders", visibleOn: ALL_VIEWPORTS },
  { key: "returns", label: "售后进度", path: "/returns", icon: CircleHelp, requireAuth: true, group: "services", visibleOn: ALL_VIEWPORTS },
  { key: "address", label: "收货地址", path: "/address", icon: MapPin, requireAuth: true, group: "services", visibleOn: ALL_VIEWPORTS },
  { key: "coupons", label: "优惠券", path: "/coupons", icon: Ticket, requireAuth: true, capability: "couponEnabled", group: "assets", visibleOn: ALL_VIEWPORTS },
  { key: "points", label: "我的积分", path: "/points", icon: Coins, requireAuth: true, capability: "pointsEnabled", loyaltyFeature: "points", group: "assets", visibleOn: ALL_VIEWPORTS },
  { key: "rewards", label: "返现记录", path: "/rewards", icon: Wallet, requireAuth: true, loyaltyFeature: "reward", group: "assets", visibleOn: ALL_VIEWPORTS },
  { key: "wallet", label: "返现余额", path: "/wallet", icon: Wallet, requireAuth: true, loyaltyFeature: "reward", group: "assets", visibleOn: ALL_VIEWPORTS },
  { key: "invite", label: "邀请好友", path: "/invite", icon: User, requireAuth: true, loyaltyFeature: "referral", group: "services", visibleOn: ALL_VIEWPORTS },
  { key: "favorites", label: "我的收藏", path: "/favorites", icon: Star, group: "assets", visibleOn: ALL_VIEWPORTS },
  { key: "history", label: "浏览记录", path: "/history", icon: Clock3, group: "services", visibleOn: ALL_VIEWPORTS },
  { key: "notifications", label: "消息通知", path: "/notifications", icon: Bell, requireAuth: true, group: "secondary", visibleOn: ALL_VIEWPORTS },
  { key: "feedback", label: "意见反馈", path: "/feedback", icon: MessageSquare, group: "secondary", visibleOn: ALL_VIEWPORTS },
  { key: "settings", label: "账户设置", path: "/settings", icon: Settings, requireAuth: true, group: "secondary", visibleOn: ALL_VIEWPORTS },
  { key: "memberBenefits", label: "会员权益", path: "/member/benefits", icon: User, requireAuth: true, capability: "memberLevelEnabled", group: "hero", visibleOn: ALL_VIEWPORTS },
  { key: "support", label: "客服中心", path: "/support-download?tab=support", icon: Headphones, capability: "customerServiceDownloadEnabled", group: "services", visibleOn: ALL_VIEWPORTS },
  { key: "install", label: "添加到桌面", path: "/support-download?tab=download", icon: Smartphone, capability: "customerServiceDownloadEnabled", group: "services", visibleOn: ALL_VIEWPORTS },
  { key: "help", label: "帮助中心", path: "/help", icon: CircleHelp, group: "secondary", visibleOn: ALL_VIEWPORTS },
  { key: "about", label: "关于我们", path: "/about", icon: Info, group: "secondary", visibleOn: ALL_VIEWPORTS },
];

export function getAccountFeature(key: AccountFeatureKey) {
  return ACCOUNT_FEATURE_REGISTRY.find((item) => item.key === key) || null;
}

export function isAccountFeatureEnabled(item: AccountFeatureItem, ctx: AccountFeatureContext): boolean {
  if (item.capability && !ctx.capabilities[item.capability]) return false;
  if (item.loyaltyFeature && !isLoyaltyFeatureEnabled(item.loyaltyFeature, ctx.capabilities, ctx.loyaltyConfig)) return false;
  return item.enabled ? item.enabled(ctx) : true;
}

export function resolveAccountFeaturePath(item: AccountFeatureItem, ctx: AccountFeatureContext): string {
  if (item.key === "support") {
    return ctx.capabilities.customerServiceDownloadEnabled ? (ctx.supportPath || item.path) : "/help";
  }
  return item.path;
}

export function buildAccountFeatures(
  group: AccountFeatureGroup,
  ctx: AccountFeatureContext,
  viewport: AccountFeatureViewport = "mobile",
) {
  return ACCOUNT_FEATURE_REGISTRY
    .filter((item) => item.group === group && item.visibleOn.includes(viewport))
    .filter((item) => isAccountFeatureEnabled(item, ctx))
    .map((item) => ({
      ...item,
      path: resolveAccountFeaturePath(item, ctx),
      value: ctx.values?.[item.key],
      count: ctx.counts?.[item.key],
      badgeText: item.key === "notifications" ? ctx.notificationBadgeText : undefined,
      auth: item.requireAuth === true,
    }));
}

export function buildAccountFeaturesByKeys(
  keys: AccountFeatureKey[],
  ctx: AccountFeatureContext,
  viewport: AccountFeatureViewport = "desktop",
) {
  return keys
    .map((key) => getAccountFeature(key))
    .filter((item): item is AccountFeatureItem => Boolean(item) && item.visibleOn.includes(viewport))
    .filter((item) => isAccountFeatureEnabled(item, ctx))
    .map((item) => ({
      ...item,
      path: resolveAccountFeaturePath(item, ctx),
      value: ctx.values?.[item.key],
      count: ctx.counts?.[item.key],
      badgeText: item.key === "notifications" ? ctx.notificationBadgeText : undefined,
      auth: item.requireAuth === true,
    }));
}

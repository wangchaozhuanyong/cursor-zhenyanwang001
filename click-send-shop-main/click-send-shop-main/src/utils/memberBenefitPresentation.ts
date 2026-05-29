import {
  BadgePercent,
  Gift,
  ShieldCheck,
  Sparkles,
  Truck,
  type LucideIcon,
} from "lucide-react";
import type { MemberBenefitsOverview, MemberBenefit } from "@/services/memberBenefitsService";
import type { MemberLevel } from "@/types/user";

export type BenefitHighlightTile = {
  label: string;
  value?: string;
  icon: LucideIcon;
};

export function benefitIcon(type: string): LucideIcon {
  if (type === "discount") return BadgePercent;
  if (type === "points_multiplier") return Sparkles;
  if (type === "free_shipping") return Truck;
  if (type === "birthday_gift") return Gift;
  return ShieldCheck;
}

export function buildBenefitSummaryFromBenefits(benefits: MemberBenefit[]): string {
  return benefits.map((b) => b.name).join(" · ") || "会员专属服务";
}

export function buildBenefitSummaryFromLevel(level?: MemberLevel | null): string {
  if (!level) return "会员专属服务";
  const parts: string[] = [];
  if (Number(level.discount_rate ?? 1) < 1) parts.push("专属折扣");
  if (Number(level.points_multiplier ?? 1) > 1) parts.push("积分加速");
  if (level.free_shipping_enabled) parts.push("免邮权益");
  parts.push("专属服务");
  return parts.join(" · ");
}

function discountLabel(rate?: number): string {
  const r = Number(rate ?? 1);
  if (r >= 1) return "全场原价";
  const pct = Math.round((1 - r) * 100);
  return pct > 0 ? `约 ${pct} 折` : "专属折扣";
}

function pointsLabel(multiplier?: number): string {
  const m = Number(multiplier ?? 1);
  return m > 1 ? `${m}x 积分` : "标准积分";
}

export function buildBenefitHighlightsFromLevel(level?: MemberLevel | null): BenefitHighlightTile[] {
  const tiles: BenefitHighlightTile[] = [];
  const rate = Number(level?.discount_rate ?? 1);
  if (rate < 1) {
    tiles.push({ label: "专属折扣", value: discountLabel(rate), icon: BadgePercent });
  }
  const mult = Number(level?.points_multiplier ?? 1);
  if (mult > 1) {
    tiles.push({ label: "积分加速", value: pointsLabel(mult), icon: Sparkles });
  }
  if (level?.free_shipping_enabled) {
    tiles.push({ label: "免邮权益", value: "达标免邮", icon: Truck });
  }
  tiles.push({ label: "专属服务", value: "售后优先", icon: ShieldCheck });

  const defaults: BenefitHighlightTile[] = [
    { label: "专属折扣", value: "会员专享", icon: BadgePercent },
    { label: "积分加速", value: "下单攒分", icon: Sparkles },
    { label: "免邮权益", value: "满额免邮", icon: Truck },
    { label: "专属服务", value: "售后优先", icon: ShieldCheck },
  ];

  while (tiles.length < 4) {
    const next = defaults.find((d) => !tiles.some((t) => t.label === d.label));
    if (next) tiles.push(next);
    else break;
  }

  return tiles.slice(0, 4);
}

export function formatLevelRequirement(level: MemberLevel): string {
  const parts: string[] = [];
  const spent = Number(level.min_spent ?? 0);
  const orders = Number(level.min_orders ?? 0);
  if (spent > 0) parts.push(`累计消费 RM ${spent.toFixed(2)}`);
  if (orders > 0) parts.push(`有效订单 ${orders} 笔`);
  return parts.length ? parts.join(" · ") : "默认等级";
}

export function computeUpgradeProgress(data: MemberBenefitsOverview | null): number {
  if (!data?.next_level) return 100;

  const growth = Number(data.growth_to_next_level ?? 0);
  const ordersLeft = Number(data.orders_to_next_level ?? 0);
  const spent = Number(data.stats?.total_spent ?? 0);
  const orderCount = Number(data.stats?.order_count ?? 0);

  if (growth <= 0 && ordersLeft <= 0) return 100;

  let spentProgress = 100;
  if (growth > 0) {
    const denom = spent + growth;
    spentProgress = denom > 0 ? (spent / denom) * 100 : 0;
  }

  let orderProgress = 100;
  if (ordersLeft > 0) {
    const denom = orderCount + ordersLeft;
    orderProgress = denom > 0 ? (orderCount / denom) * 100 : 0;
  }

  const raw = Math.max(spentProgress, orderProgress);
  return Math.min(92, Math.max(8, Math.round(raw)));
}

export const MEMBER_BENEFIT_TILE_BG =
  "bg-[color-mix(in_srgb,var(--theme-surface)_14%,transparent)]";

export const MEMBER_BENEFIT_SUMMARY_BG =
  "bg-[color-mix(in_srgb,var(--theme-surface)_18%,transparent)]";

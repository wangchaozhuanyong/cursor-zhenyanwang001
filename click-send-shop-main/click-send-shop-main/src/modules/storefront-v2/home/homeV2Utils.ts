import type { FooterNavItem } from "@/types/content";
import type { Product } from "@/types/product";
import type { StorefrontCampaignType, StorefrontCampaignVm } from "../campaign/campaignTypes";

export const CAMPAIGN_TYPE_LABELS: Record<StorefrontCampaignType, string> = {
  flash_sale: "限时秒杀",
  full_reduction: "满减活动",
  full_discount: "满折活动",
  coupon: "领券优惠",
  new_user_gift: "新人礼包",
  promotion: "主题活动",
  notice: "活动提醒",
};

const CAMPAIGN_PRIORITY: StorefrontCampaignType[] = [
  "flash_sale",
  "full_reduction",
  "full_discount",
  "coupon",
  "new_user_gift",
  "promotion",
  "notice",
];

const HOME_CAMPAIGN_ENTRANCES: StorefrontCampaignVm[] = [
  {
    id: "local-home-flash-sale",
    type: "flash_sale",
    title: "限时秒杀专区",
    subtitle: "热销商品和限时活动集中查看",
    promoLabel: "马上抢",
    href: "/promotions?type=flash_sale",
    tone: "danger",
    products: [],
    coupons: [],
    source: "local",
  },
  {
    id: "local-home-coupon",
    type: "coupon",
    title: "领取优惠券",
    subtitle: "下单前先领券，优惠集中在这里",
    promoLabel: "先领券",
    href: "/coupons",
    tone: "success",
    products: [],
    coupons: [],
    source: "local",
  },
  {
    id: "local-home-full-reduction",
    type: "full_reduction",
    title: "满减优惠",
    subtitle: "凑单优惠和组合活动一处查看",
    promoLabel: "自动结算",
    href: "/promotions?type=full_reduction",
    tone: "price",
    products: [],
    coupons: [],
    source: "local",
  },
  {
    id: "local-home-full-discount",
    type: "full_discount",
    title: "满折优惠",
    subtitle: "按订单金额自动打折",
    promoLabel: "满额打折",
    href: "/promotions?type=full_discount",
    tone: "price",
    products: [],
    coupons: [],
    source: "local",
  },
  {
    id: "local-home-new-user-gift",
    type: "new_user_gift",
    title: "新人福利",
    subtitle: "新会员专属优惠入口",
    promoLabel: "新人专享",
    href: "/coupons",
    tone: "primary",
    products: [],
    coupons: [],
    source: "local",
  },
];

export function buildHomeCampaignEntrances(types: StorefrontCampaignType[]) {
  const allowed = new Set(types);
  return HOME_CAMPAIGN_ENTRANCES.filter((campaign) => allowed.has(campaign.type));
}

export function formatHomeV2Money(value: number | string | null | undefined) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(2).replace(/\.00$/, "");
}

export function pickPrimaryCampaign(campaigns: StorefrontCampaignVm[]) {
  const sorted = [...campaigns].sort((a, b) => {
    const aPriority = CAMPAIGN_PRIORITY.indexOf(a.type);
    const bPriority = CAMPAIGN_PRIORITY.indexOf(b.type);
    return (aPriority === -1 ? 99 : aPriority) - (bPriority === -1 ? 99 : bPriority);
  });
  return sorted[0] ?? null;
}

export function campaignActionLabel(campaign: StorefrontCampaignVm) {
  if (campaign.type === "coupon" || campaign.type === "new_user_gift") return "去领券";
  if (campaign.type === "flash_sale") return "马上抢";
  return "查看活动";
}

export function uniqueProducts(products: Product[], limit: number) {
  const seen = new Set<string>();
  const out: Product[] = [];
  for (const product of products) {
    if (!product?.id || seen.has(product.id)) continue;
    seen.add(product.id);
    out.push(product);
    if (out.length >= limit) break;
  }
  return out;
}

export function parseFooterNav(json?: string): FooterNavItem[] | null {
  if (!json || !json.trim()) return null;
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) return null;
    const items = parsed
      .filter(
        (it): it is FooterNavItem =>
          it &&
          typeof it.label === "string" &&
          typeof it.path === "string" &&
          it.enabled !== false &&
          (it.section === undefined ||
            it.section === "support" ||
            it.section === "policy" ||
            it.section === "other"),
      )
      .sort((a, b) => Number(a.sortOrder ?? 0) - Number(b.sortOrder ?? 0));
    return items.length > 0 ? items : null;
  } catch {
    return null;
  }
}

export function dedupeFooterNav(items: FooterNavItem[]) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.label}::${item.path}`;
    if (!item.path.trim() || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

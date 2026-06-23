import type { HomeNavItem } from "@/types/content";
import type { SiteCapabilities } from "@/types/siteCapabilities";
import { isHomeNavItemVisible } from "@/utils/homeNavCapabilities";

export function normalizeHomeNavText(value: string | undefined, fallback = ""): string {
  const text = (value || "").trim();
  return text || fallback;
}

export function homeNavBlockedMessage(item: HomeNavItem): string {
  if (item.target_type === "support") return "客服中心暂未开放";
  const link = (item.link_url || "").trim();
  const base = (link.startsWith("/") ? link : `/${link}`).split("?")[0];
  if (base.startsWith("/support-download")) return "客服中心暂未开放";
  if (base.startsWith("/coupons")) return "优惠券功能暂未开放";
  if (
    item.target_type === "categories"
    || item.target_type === "category"
    || ["/categories", "/new-arrivals", "/search", "/cart", "/checkout"].includes(base)
    || base.startsWith("/product/")
  ) {
    return "商城功能暂未开放";
  }
  return "该功能暂未开放";
}

export function resolveHomeNavTarget(item: HomeNavItem): string {
  if (item.target_type === "categories") return "/categories";
  if (item.target_type === "category" && item.target_category_id) {
    return `/categories?cat=${item.target_category_id}`;
  }
  return item.link_url || "";
}

export function openHomeNavItemTarget(
  item: HomeNavItem,
  caps: SiteCapabilities,
  onNavigate: (path: string) => void,
  onBlocked: (message: string) => void,
) {
  if (!isHomeNavItemVisible(item, caps)) {
    onBlocked(homeNavBlockedMessage(item));
    return;
  }
  const target = resolveHomeNavTarget(item).trim();
  if (!target) {
    onBlocked("该入口暂未配置跳转地址");
    return;
  }
  if (/^https?:\/\//i.test(target)) {
    window.open(target, "_blank", "noopener,noreferrer");
    return;
  }
  onNavigate(target.startsWith("/") ? target : `/${target}`);
}

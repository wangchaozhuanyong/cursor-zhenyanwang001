import { Tx } from "@/components/admin/AdminText";
import { useAdminTOptional } from "@/hooks/useAdminT";
import type { UserProfile, UserTag } from "@/types/user";
import { productTagBadgeClass } from "@/utils/productTagBadge";

export const ACCOUNT_STATUS_LABELS: Record<string, string> = {
  normal: "正常",
  disabled: "禁用登录",
  blacklisted: "黑名单",
};

export function UserTagBadges({ tags }: { tags?: UserTag[] }) {
  if (!tags?.length) return <span className="text-xs text-muted-foreground"><Tx>无标签</Tx></span>;
  return (
    <div className="flex flex-wrap gap-1">
      {tags.map((tag) => (
        <span key={tag.id} className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${productTagBadgeClass(tag.color)}`}>
          {tag.name}
        </span>
      ))}
    </div>
  );
}

export function UserStatusBadges({ user }: { user: UserProfile }) {
  const { locale, tText } = useAdminTOptional();
  const isEn = locale === "en";
  const L = (zh: string, en: string) => (isEn ? en : zh);
  const accountStatus = String(user.account_status || "normal");
  const items = [
    accountStatus === "disabled" ? L("禁用登录", "Login disabled") : null,
    accountStatus === "blacklisted" ? L("黑名单", "Blacklisted") : null,
    Number(user.order_restricted || 0) ? L("限制下单", "Order restricted") : null,
    Number(user.coupon_restricted || 0) ? L("限制领券", "Coupon restricted") : null,
    Number(user.comment_restricted || 0) ? L("限制评论", "Comment restricted") : null,
  ].filter(Boolean) as string[];
  if (!items.length) return <span className="text-xs text-emerald-700">{L("正常", "Normal")}</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((item) => (
        <span key={item} className="rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] text-amber-700">
          {item}
        </span>
      ))}
    </div>
  );
}

export function filterBoundLabel(tText: (zh: string) => string, prefix: string, value: string) {
  if (value === "1") return prefix.includes("WeChat") || prefix.includes("Phone") ? `${prefix}: Bound` : tText(`${prefix}：已绑定`);
  if (value === "0") return prefix.includes("WeChat") || prefix.includes("Phone") ? `${prefix}: Not bound` : tText(`${prefix}：未绑定`);
  return "";
}

export function restrictionLabel(tText: (zh: string) => string, prefix: string, value: string) {
  if (value === "1") return prefix ? `${prefix}: Restricted` : tText(`${prefix}：已限制`);
  if (value === "0") return prefix ? `${prefix}: Not restricted` : tText(`${prefix}：未限制`);
  return "";
}

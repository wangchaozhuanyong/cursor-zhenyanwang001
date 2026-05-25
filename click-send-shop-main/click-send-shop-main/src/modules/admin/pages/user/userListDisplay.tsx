import { Tx } from "@/components/admin/AdminText";
import { useAdminT } from "@/hooks/useAdminT";
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
  const { tText } = useAdminT();
  const accountStatus = String(user.account_status || "normal");
  const items = [
    accountStatus === "disabled" ? tText("禁用登录") : null,
    accountStatus === "blacklisted" ? tText("黑名单") : null,
    Number(user.order_restricted || 0) ? tText("限制下单") : null,
    Number(user.coupon_restricted || 0) ? tText("限制领券") : null,
    Number(user.comment_restricted || 0) ? tText("限制评论") : null,
  ].filter(Boolean) as string[];
  if (!items.length) return <span className="text-xs text-emerald-700"><Tx>正常</Tx></span>;
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
  if (value === "1") return tText(`${prefix}：已绑定`);
  if (value === "0") return tText(`${prefix}：未绑定`);
  return "";
}

export function restrictionLabel(tText: (zh: string) => string, prefix: string, value: string) {
  if (value === "1") return tText(`${prefix}：已限制`);
  if (value === "0") return tText(`${prefix}：未限制`);
  return "";
}

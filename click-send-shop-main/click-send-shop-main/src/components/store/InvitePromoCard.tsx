import { Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  THEME_GIFT_BADGE_SHELL,
  THEME_INVITE_PROMO_CTA,
  THEME_INVITE_PROMO_MUTED,
  THEME_INVITE_PROMO_SHELL,
} from "@/utils/themeVisuals";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

export type InvitePromoCardProps = {
  loggedIn?: boolean;
  inviteCount?: number;
  rewardBalance?: number;
  onAction?: () => void;
  className?: string;
};

function InviteGiftBadge() {
  return (
    <div
      className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${THEME_GIFT_BADGE_SHELL} ring-[var(--theme-gift-badge-ring)]`}
      aria-hidden
    >
      <Gift className="relative z-[1]" size={18} strokeWidth={2.25} />
    </div>
  );
}

export default function InvitePromoCard({
  loggedIn = true,
  inviteCount = 0,
  rewardBalance = 0,
  onAction,
  className = "",
}: InvitePromoCardProps) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl px-4 py-3.5", THEME_INVITE_PROMO_SHELL, className)}>
      <div className="flex items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold leading-snug text-[var(--theme-invite-promo-foreground)]">邀请好友得奖励</p>
          <p className={`mt-1 text-xs leading-relaxed ${THEME_INVITE_PROMO_MUTED}`}>
            {loggedIn ? "好友付款成功即可获得现金返现" : "登录后邀请好友获得现金返现"}
          </p>
          <p className={`mt-1.5 text-xs leading-snug ${THEME_INVITE_PROMO_MUTED}`}>
            {loggedIn
              ? `已邀请 ${inviteCount} 人，累计返现 RM ${rewardBalance.toFixed(2)}`
              : "登录后查看邀请奖励"}
          </p>
        </div>
        <div className="flex w-[5.25rem] shrink-0 flex-col items-center justify-center gap-2">
          <InviteGiftBadge />
          <UnifiedButton
            type="button"
            onClick={onAction}
            className={`w-full whitespace-nowrap rounded-full px-2 py-2 text-center text-xs font-semibold ${THEME_INVITE_PROMO_CTA}`}
            style={{ background: "var(--theme-invite-promo-cta-bg)", color: "var(--theme-invite-promo-cta-fg)" }}
          >
            {loggedIn ? "立即邀请" : "去登录"}
          </UnifiedButton>
        </div>
      </div>
    </div>
  );
}

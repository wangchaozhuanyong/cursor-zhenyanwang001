import { Bell } from "lucide-react";
import { formatUnreadBadge } from "@/utils/notificationBadge";
import { UnifiedButton } from "@/components/ui/UnifiedButton";

type NotificationIconButtonProps = {
  unreadCount?: number;
  onClick: () => void;
  className?: string;
};

export default function NotificationIconButton({
  unreadCount = 0,
  onClick,
  className = "",
}: NotificationIconButtonProps) {
  const badgeText = formatUnreadBadge(unreadCount);

  return (
    <UnifiedButton
      type="button"
      className={`store-notification-button relative flex h-[2.625rem] w-[2.625rem] overflow-visible items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/50 ${className}`}
      onClick={onClick}
      aria-label={badgeText ? `消息通知，未读 ${badgeText}` : "消息通知"}
    >
      <Bell size={16} className="relative z-[1] text-[var(--theme-text)]" />
      {badgeText ? (
        <span
          className="store-notification-badge absolute -right-0.5 -top-0.5 z-[3] inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--theme-price)] px-[0.22rem] text-[10px] font-extrabold leading-none text-[var(--theme-price-foreground)] shadow-[0_7px_16px_-8px_var(--theme-price)] ring-2 ring-[var(--theme-surface)]"
          aria-hidden="true"
        >
          {badgeText}
        </span>
      ) : null}
    </UnifiedButton>
  );
}

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
      className={`store-notification-button relative flex h-9 w-9 overflow-visible items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/50 ${className}`}
      onClick={onClick}
      aria-label={badgeText ? `消息通知，未读 ${badgeText}` : "消息通知"}
    >
      <Bell size={16} className="relative z-[1] text-[var(--theme-text)]" />
      {badgeText ? (
        <span
          className="store-notification-badge absolute right-0 top-0 z-[3] inline-flex h-[1.15rem] min-w-[1.15rem] translate-x-[34%] -translate-y-[30%] items-center justify-center rounded-full bg-[var(--theme-price)] px-[0.28rem] text-[10px] font-extrabold leading-none text-white shadow-[0_7px_16px_-8px_var(--theme-price)] ring-2 ring-[var(--theme-surface)]"
          aria-hidden="true"
        >
          {badgeText}
        </span>
      ) : null}
    </UnifiedButton>
  );
}

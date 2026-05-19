import { Bell } from "lucide-react";
import { formatUnreadBadge } from "@/utils/notificationBadge";

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
    <button
      type="button"
      className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/50 ${className}`}
      onClick={onClick}
      aria-label={badgeText ? `消息通知，未读 ${badgeText}` : "消息通知"}
    >
      <Bell size={16} className="text-[var(--theme-text)]" />
      {badgeText ? (
        <span
          className="absolute -right-1 -top-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full border border-[var(--theme-bg)] bg-[var(--theme-price)] px-1 text-[10px] font-bold leading-none text-primary-foreground"
          aria-hidden="true"
        >
          {badgeText}
        </span>
      ) : null}
    </button>
  );
}

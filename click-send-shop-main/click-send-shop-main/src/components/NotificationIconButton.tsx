import { Bell } from "lucide-react";

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
  return (
    <button
      type="button"
      className={`relative flex h-9 w-9 items-center justify-center rounded-full border border-[var(--theme-border)] bg-[var(--theme-surface)]/50 ${className}`}
      onClick={onClick}
      aria-label="通知"
    >
      <Bell size={16} className="text-[var(--theme-text)]" />
      {unreadCount > 0 ? (
        <span className="absolute right-1 top-1 h-2 w-2 rounded-full border border-[var(--theme-bg)] bg-[var(--theme-price)]" />
      ) : null}
    </button>
  );
}

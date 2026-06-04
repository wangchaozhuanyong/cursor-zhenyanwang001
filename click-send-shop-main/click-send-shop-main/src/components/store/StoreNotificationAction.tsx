import NotificationIconButton from "@/components/NotificationIconButton";
import { useNotificationStore } from "@/stores/useNotificationStore";

type StoreNotificationActionProps = {
  onClick: () => void;
};

export default function StoreNotificationAction({ onClick }: StoreNotificationActionProps) {
  const unreadCount = useNotificationStore((s) => s.unreadCount);
  return <NotificationIconButton unreadCount={unreadCount} onClick={onClick} />;
}

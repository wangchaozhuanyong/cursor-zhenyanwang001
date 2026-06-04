import { Bell, CircleHelp, Clock3, Headphones, Info, MapPin, MessageSquare, Settings, Smartphone } from "lucide-react";
import type { ProfileServiceItem } from "./ProfileSections";

export function buildShoppingServiceItems(customerServiceDownloadEnabled: boolean): ProfileServiceItem[] {
  return [
    { key: "address", label: "收货地址", icon: MapPin, path: "/address", auth: true },
    { key: "returns", label: "售后进度", icon: CircleHelp, path: "/returns", auth: true },
    { key: "support", label: "客服中心", icon: Headphones, path: customerServiceDownloadEnabled ? "/support-download?tab=support" : "/help", auth: false },
    { key: "history", label: "浏览记录", icon: Clock3, path: "/history", auth: false },
  ];
}

export function buildProfileSecondaryItems(notificationBadgeText: string): ProfileServiceItem[] {
  return [
    { key: "help", label: "帮助中心", icon: CircleHelp, path: "/help", auth: false },
    { key: "feedback", label: "意见反馈", icon: MessageSquare, path: "/feedback", auth: false },
    { key: "about", label: "关于我们", icon: Info, path: "/about", auth: false },
    { key: "settings", label: "账户设置", icon: Settings, path: "/settings", auth: true },
    { key: "notifications", label: "消息通知", icon: Bell, path: "/notifications", auth: true, badgeText: notificationBadgeText },
  ];
}

export function buildInstallShortcutItem(showInstallShortcut: boolean, customerServiceDownloadEnabled: boolean): ProfileServiceItem | null {
  if (!showInstallShortcut || !customerServiceDownloadEnabled) return null;
  return { key: "install", label: "添加桌面", icon: Smartphone, path: "/support-download?tab=download", auth: false };
}

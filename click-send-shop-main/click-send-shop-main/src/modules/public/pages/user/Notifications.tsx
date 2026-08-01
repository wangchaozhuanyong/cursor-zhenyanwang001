import { formatDateTime } from "@/utils/formatDateTime";
import { lazy, Suspense, useEffect, useState } from "react";
import "@/styles/notifications-route.css";
import {
  Bell,
  Package,
  Ticket,
  Megaphone,
  Check,
  Loader2,
  Gift,
  CreditCard,
  Truck,
  RotateCcw,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";

import { useGoBack } from "@/hooks/useGoBack";
import { useNotificationStore } from "@/stores/useNotificationStore";
import type { NotificationType } from "@/types/notification";
import { formatUnreadBadge } from "@/utils/notificationBadge";
import { normalizeNotificationDisplay } from "@/utils/notificationDisplayLabels";
import {
  THEME_BADGE_ACCENT,
  THEME_BADGE_DANGER,
  THEME_BADGE_MUTED,
  THEME_BADGE_PRICE,
  THEME_BADGE_PRIMARY,
  THEME_BADGE_SUCCESS,
  THEME_BADGE_WARNING,
} from "@/utils/themeVisuals";
import StoreAccountLayout from "@/components/store/StoreAccountLayout";
import { UnifiedButton } from "@/components/ui/UnifiedButton";
import { useHorizontalActiveScroll } from "@/hooks/useHorizontalActiveScroll";
import { useStorefrontNavigate } from "@/components/storefront-motion/useStorefrontNavigate";

const LazyNotificationsAppModal = lazy(() =>
  import("@/modules/micro-interactions/components/AppModal").then((module) => ({ default: module.AppModal })),
);

const typeConfig: Record<NotificationType, { icon: typeof Bell; color: string }> = {
  order: { icon: Package, color: THEME_BADGE_PRIMARY },
  shipping: { icon: Truck, color: THEME_BADGE_PRIMARY },
  payment: { icon: CreditCard, color: THEME_BADGE_SUCCESS },
  refund: { icon: RotateCcw, color: THEME_BADGE_DANGER },
  after_sale: { icon: ShieldCheck, color: THEME_BADGE_ACCENT },
  promotion: { icon: Megaphone, color: THEME_BADGE_PRICE },
  coupon: { icon: Ticket, color: THEME_BADGE_WARNING },
  points: { icon: Ticket, color: THEME_BADGE_SUCCESS },
  reward: { icon: Gift, color: THEME_BADGE_ACCENT },
  system: { icon: Bell, color: THEME_BADGE_MUTED },
};

const fallbackConfig = { icon: Bell, color: THEME_BADGE_MUTED };

type NotificationFilter = "all" | "order" | "promotion" | "system";

const NOTIFICATION_FILTERS: Array<{
  key: NotificationFilter;
  label: string;
  icon: typeof Bell;
}> = [
  { key: "all", label: "全部", icon: Bell },
  { key: "order", label: "订单", icon: Package },
  { key: "promotion", label: "优惠", icon: Megaphone },
  { key: "system", label: "系统", icon: ShieldCheck },
];

function getNotificationFilter(type: NotificationType): Exclude<NotificationFilter, "all"> {
  if (type === "order" || type === "shipping" || type === "payment" || type === "refund" || type === "after_sale") {
    return "order";
  }
  if (type === "promotion" || type === "coupon" || type === "points" || type === "reward") {
    return "promotion";
  }
  return "system";
}

export default function Notifications() {
  const navigate = useStorefrontNavigate();
  const goBack = useGoBack();
  const { notifications, unreadCount, loading, error, loadNotifications, markAsRead, markAllAsRead } =
    useNotificationStore();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filter, setFilter] = useState<NotificationFilter>("all");
  const { containerRef: filtersRef, setItemRef: setFilterRef, scrollToKey: scrollFilterToKey } =
    useHorizontalActiveScroll<HTMLDivElement, HTMLButtonElement>(filter, NOTIFICATION_FILTERS.length);
  const active = notifications.find((n) => n.id === activeId) || null;
  const unreadBadgeText = formatUnreadBadge(unreadCount);
  const filterCounts = notifications.reduce<Record<NotificationFilter, number>>((acc, item) => {
    acc.all += 1;
    acc[getNotificationFilter(item.type)] += 1;
    return acc;
  }, { all: 0, order: 0, promotion: 0, system: 0 });
  const filteredNotifications = filter === "all"
    ? notifications
    : notifications.filter((item) => getNotificationFilter(item.type) === filter);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  const handleOpenNotification = async (id: string, linkUrl?: string | null) => {
    await markAsRead(id);
    if (linkUrl) {
      navigate(linkUrl);
      return;
    }
    setActiveId(id);
  };

  if (loading && notifications.length === 0) {
    return (
      <StoreAccountLayout
        title="消息通知"
        onBack={goBack}
        className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-notifications-page"
        mainClassName="sf-next-account-main sm:px-4 xl:py-6"
      >
        <section className="sf-next-state-panel sf-next-account-status-panel" aria-live="polite">
          <span className="sf-next-state-panel__icon" aria-hidden>
            <Loader2 size={28} className="animate-spin" />
          </span>
          <h2>正在加载消息</h2>
          <p>正在同步订单、优惠和系统通知。</p>
        </section>
      </StoreAccountLayout>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <StoreAccountLayout
        title="消息通知"
        onBack={goBack}
        className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-notifications-page"
        mainClassName="sf-next-account-main sm:px-4 xl:py-6"
      >
        <section className="sf-next-state-panel sf-next-account-status-panel" role="alert">
          <span className="sf-next-state-panel__icon" aria-hidden>
            <Bell size={28} />
          </span>
          <h2>消息加载失败</h2>
          <p>{error}</p>
          <UnifiedButton type="button" onClick={() => loadNotifications()} className="sf-next-state-panel__primary">
            <RefreshCw size={17} aria-hidden />
            重试
          </UnifiedButton>
        </section>
      </StoreAccountLayout>
    );
  }

  const notificationTitle = (
    <span className="inline-flex items-center gap-2">
      <span>消息通知</span>
      {unreadBadgeText ? (
        <span className="sf-next-notifications-unread-count" aria-label={`${unreadCount} 条未读消息`}>
          未读 {unreadBadgeText}
        </span>
      ) : null}
    </span>
  );

  return (
    <>
      <StoreAccountLayout
        title={notificationTitle}
        onBack={goBack}
        className="sf-next-page sf-next-route-page sf-next-account-route-page sf-next-notifications-page"
        mainClassName="sf-next-account-main sm:px-4 xl:pb-12 xl:pt-6"
      >
        <div className="sf-next-notifications-toolbar">
          <p>{unreadCount > 0 ? `还有 ${unreadCount} 条消息未读` : "消息均已读"}</p>
          {unreadCount > 0 ? (
            <UnifiedButton type="button" onClick={markAllAsRead} className="sf-next-notifications-mark-read">
              <Check size={15} aria-hidden />
              <span>全部已读</span>
            </UnifiedButton>
          ) : null}
        </div>
        <div ref={filtersRef} className="sf-next-notifications-filters no-scrollbar">
          {NOTIFICATION_FILTERS.map((item) => {
            const Icon = item.icon;
            const activeFilter = filter === item.key;
            return (
              <UnifiedButton
                key={item.key}
                ref={(el) => setFilterRef(item.key, el)}
                type="button"
                onClick={() => {
                  scrollFilterToKey(item.key);
                  setFilter(item.key);
                }}
                className={`sf-next-notifications-filter ${activeFilter ? "is-active" : ""}`}
              >
                <span className="inline-flex min-w-0 items-center gap-1.5">
                  <Icon size={14} aria-hidden className="shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                <span className="shrink-0 text-xs font-black">{filterCounts[item.key]}</span>
              </UnifiedButton>
            );
          })}
        </div>
        {!loading && notifications.length === 0 && (
          <section className="sf-next-state-panel sf-next-account-status-panel sf-next-notifications-empty">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <Bell size={28} />
            </span>
            <h2>暂无消息通知</h2>
            <p>订单、物流、优惠和系统消息会出现在这里。</p>
          </section>
        )}
        {notifications.length > 0 && filteredNotifications.length === 0 ? (
          <section className="sf-next-state-panel sf-next-account-status-panel">
            <span className="sf-next-state-panel__icon" aria-hidden>
              <Bell size={28} />
            </span>
            <h2>当前分类暂无消息</h2>
            <p>切换到其他分类，或稍后再查看新的提醒。</p>
          </section>
        ) : null}
        <div className="sf-next-notifications-list">
          {filteredNotifications.map((n, i) => {
            const config = typeConfig[n.type] || fallbackConfig;
            const Icon = config.icon;
            const display = normalizeNotificationDisplay(n.title, n.content);
            return (
              <UnifiedButton
                key={n.id}
                style={{ animationDelay: `${i * 40}ms` }}
                onClick={() => handleOpenNotification(n.id, n.link_url)}
                className={`sf-next-notifications-card ${n.is_read ? "" : "is-unread"}`}
              >
                {!n.is_read && (
                  <span className="sf-next-notifications-unread-dot" aria-label="未读" />
                )}
                <div className={`sf-next-notifications-card__icon ${config.color}`}>
                  <Icon size={18} aria-hidden />
                </div>
                <div className="sf-next-notifications-card__copy">
                  <div className="sf-next-notifications-card__heading">
                    <p>{display.title}</p>
                    <time>{formatDateTime(n.created_at)}</time>
                  </div>
                  <p className="sf-next-notifications-card__content">{display.content}</p>
                </div>
              </UnifiedButton>
            );
          })}
        </div>
      </StoreAccountLayout>

      {active ? (
        <Suspense fallback={null}>
          <LazyNotificationsAppModal
            tier="standard"
            open
            onClose={() => setActiveId(null)}
            title={normalizeNotificationDisplay(active.title, active.content).title}
            height="70vh"
            showCloseButton
          >
            <div className="whitespace-pre-wrap break-words pb-2 text-sm leading-6 text-[var(--theme-text)]">
              {normalizeNotificationDisplay(active.title, active.content).content}
            </div>
          </LazyNotificationsAppModal>
        </Suspense>
      ) : null}
    </>
  );
}
